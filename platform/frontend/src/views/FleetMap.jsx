import { useEffect, useMemo, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { colors } from '../design/tokens';
import dfwClassB from '../assets/dfwClassB';
import DetailPanel from '../components/DetailPanel';

const DFW_CENTER = [-96.797, 32.776];
const LERP = 0.45;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

const STATUS_CLASS = {
  'in-flight': 'fleet-marker--inflight',
  charging: 'fleet-marker--charging',
  maintenance: 'fleet-marker--maintenance',
  grounded: 'fleet-marker--grounded',
  ready: 'fleet-marker--ready',
};

function markerClassForStatus(status) {
  return STATUS_CLASS[status] || 'fleet-marker--ready';
}

function createMarkerElement(aircraft, onSelect) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `fleet-marker ${markerClassForStatus(aircraft.status)}`;
  button.setAttribute(
    'aria-label',
    `${aircraft.tail_number}, ${aircraft.status}, battery ${aircraft.battery_pct}%`
  );

  const dot = document.createElement('span');
  dot.className = 'fleet-marker-dot';
  dot.setAttribute('aria-hidden', 'true');

  const label = document.createElement('span');
  label.className = 'fleet-marker-label';
  label.textContent = aircraft.tail_number;

  button.append(dot, label);
  button.addEventListener('click', () => onSelect(aircraft.aircraft_id, button));

  return { button, label };
}

function FleetMap({ fleetState }) {
  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerStoreRef = useRef(new Map());
  const rafRef = useRef(0);

  const [selectedAircraftId, setSelectedAircraftId] = useState(null);
  const lastTriggerRef = useRef(null);

  const aircraftRows = useMemo(
    () => Object.values(fleetState || {}).sort((a, b) => a.tail_number.localeCompare(b.tail_number)),
    [fleetState]
  );
  const aircraftCount = aircraftRows.length;

  useEffect(() => {
    if (!mapboxToken || !mapContainerRef.current || mapRef.current) {
      return;
    }

    const markerStore = markerStoreRef.current;

    mapboxgl.accessToken = mapboxToken;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: DFW_CENTER,
      zoom: 9.7,
      pitch: 0,
      bearing: 0,
      attributionControl: true,
    });

    mapRef.current = map;

    const applyMarkerScale = () => {
      const zoom = map.getZoom();
      const scale = clamp(0.35 + (zoom - 7.5) * 0.22, 0.35, 2.2);
      markerStore.forEach((entry) => {
        entry.element.style.setProperty('--marker-scale', String(scale));
      });
    };

    const handleZoom = () => {
      applyMarkerScale();
    };

    map.on('zoom', handleZoom);

    map.on('load', () => {
      map.addSource('dfw-class-b', {
        type: 'geojson',
        data: dfwClassB,
      });

      map.addLayer({
        id: 'dfw-class-b-fill',
        type: 'fill',
        source: 'dfw-class-b',
        paint: {
          'fill-color': colors.status.grounded,
          'fill-opacity': 0.1,
        },
      });

      map.addLayer({
        id: 'dfw-class-b-outline',
        type: 'line',
        source: 'dfw-class-b',
        paint: {
          'line-color': colors.status.grounded,
          'line-width': 1.25,
          'line-opacity': 0.7,
        },
      });
    });

    const animate = () => {
      markerStore.forEach((entry) => {
        const dLng = entry.targetLng - entry.currentLng;
        const dLat = entry.targetLat - entry.currentLat;

        // If jump is large (status transition/route switch), snap to target.
        if (Math.abs(dLng) + Math.abs(dLat) > 0.08) {
          entry.currentLng = entry.targetLng;
          entry.currentLat = entry.targetLat;
        } else {
          entry.currentLng += dLng * LERP;
          entry.currentLat += dLat * LERP;
        }

        entry.marker.setLngLat([entry.currentLng, entry.currentLat]);
      });

      // Force repaint so marker transforms never depend on user interaction.
      map.triggerRepaint();
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    applyMarkerScale();

    return () => {
      cancelAnimationFrame(rafRef.current);
      map.off('zoom', handleZoom);
      markerStore.forEach((entry) => entry.marker.remove());
      markerStore.clear();
      map.remove();
      mapRef.current = null;
    };
  }, [mapboxToken]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    const activeIds = new Set();

    for (const aircraft of aircraftRows) {
      if (typeof aircraft.lng !== 'number' || typeof aircraft.lat !== 'number') {
        continue;
      }

      activeIds.add(aircraft.aircraft_id);
      const existing = markerStoreRef.current.get(aircraft.aircraft_id);

      if (!existing) {
        const { button, label } = createMarkerElement(aircraft, (aircraftId, triggerEl) => {
          lastTriggerRef.current = triggerEl || null;
          setSelectedAircraftId(aircraftId);
        });
        const marker = new mapboxgl.Marker({ element: button, anchor: 'center' })
          .setLngLat([aircraft.lng, aircraft.lat])
          .addTo(map);

        button.style.setProperty('--marker-scale', '1');

        markerStoreRef.current.set(aircraft.aircraft_id, {
          marker,
          element: button,
          label,
          tail_number: aircraft.tail_number,
          status: aircraft.status,
          battery_pct: aircraft.battery_pct,
          currentLng: aircraft.lng,
          currentLat: aircraft.lat,
          targetLng: aircraft.lng,
          targetLat: aircraft.lat,
        });
        continue;
      }

      existing.targetLng = aircraft.lng;
      existing.targetLat = aircraft.lat;

      if (existing.status !== aircraft.status) {
        existing.status = aircraft.status;
        existing.element.className = `fleet-marker ${markerClassForStatus(aircraft.status)}`;
      }

      if (existing.tail_number !== aircraft.tail_number) {
        existing.tail_number = aircraft.tail_number;
        existing.label.textContent = aircraft.tail_number;
      }

      if (existing.battery_pct !== aircraft.battery_pct || existing.status !== aircraft.status) {
        existing.battery_pct = aircraft.battery_pct;
        existing.element.setAttribute(
          'aria-label',
          `${aircraft.tail_number}, ${aircraft.status}, battery ${aircraft.battery_pct}%`
        );
      }
    }

    for (const [aircraftId, entry] of markerStoreRef.current.entries()) {
      if (!activeIds.has(aircraftId)) {
        entry.marker.remove();
        markerStoreRef.current.delete(aircraftId);
      }
    }
  }, [aircraftRows]);

  useEffect(() => {
    markerStoreRef.current.forEach((entry, aircraftId) => {
      if (aircraftId === selectedAircraftId) {
        entry.element.classList.add('fleet-marker--selected');
      } else {
        entry.element.classList.remove('fleet-marker--selected');
      }
    });
  }, [selectedAircraftId]);

  if (!mapboxToken) {
    return (
      <section className="view-panel" role="alert" aria-labelledby="map-token-title">
        <h1 id="map-token-title">Map unavailable</h1>
        <p>Mapbox token not configured.</p>
        <p>
          Set <code>VITE_MAPBOX_TOKEN</code> in <code>platform/.env</code> (or{' '}
          <code>platform/frontend/.env</code>) and restart the frontend.
        </p>
      </section>
    );
  }

  const selectedAircraft = selectedAircraftId
    ? aircraftRows.find((row) => row.aircraft_id === selectedAircraftId)
    : null;

  const closeDetailPanel = () => {
    setSelectedAircraftId(null);
    if (lastTriggerRef.current && typeof lastTriggerRef.current.focus === 'function') {
      lastTriggerRef.current.focus();
    }
  };

  return (
    <section className="fleet-map-layout" aria-labelledby="fleet-map-title">
      <h1 id="fleet-map-title" className="fleet-map-title">
        Fleet Map
      </h1>

      <div className="fleet-map-stack">
        <div ref={mapContainerRef} className="fleet-map-canvas" />

        <aside className="fleet-map-overlay" aria-label="Map status panel">
          <p className="zone-pill">DFW Class B - Active</p>
          <p className="zone-count">Aircraft online: {aircraftCount}</p>
        </aside>
      </div>

      <div className="fleet-map-toolbar" aria-label="Aircraft quick select">
        {aircraftRows.map((aircraft) => (
          <button
            key={aircraft.aircraft_id}
            type="button"
            className={`aircraft-chip ${
              selectedAircraftId === aircraft.aircraft_id ? 'aircraft-chip--active' : ''
            }`}
            onClick={(event) => {
              lastTriggerRef.current = event.currentTarget;
              setSelectedAircraftId(aircraft.aircraft_id);
            }}
          >
            {aircraft.tail_number}
          </button>
        ))}
      </div>

      <p className="fleet-map-selection" aria-live="polite">
        {selectedAircraft
          ? `Selected ${selectedAircraft.tail_number} (${selectedAircraft.status}, ${selectedAircraft.battery_pct}%)`
          : 'Select an aircraft marker or chip to inspect its live state.'}
      </p>

      <DetailPanel
        aircraft={selectedAircraft}
        isOpen={Boolean(selectedAircraft)}
        onClose={closeDetailPanel}
      />
    </section>
  );
}

export default FleetMap;
