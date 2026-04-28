import { useEffect, useMemo, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { colors } from '../design/tokens';
import dfwClassB from '../assets/dfwClassB';
import DetailPanel from '../components/DetailPanel';
import { useMissionSocket } from '../hooks/useMissionSocket';
import { dedupeFleetRowsByTail } from '../utils/fleetDedupe';

const DFW_CENTER = [-96.797, 32.776];
const LERP = 0.32;
const MISSION_ROUTE_SOURCE = 'selected-mission-route';
const MISSION_ENDPOINT_SOURCE = 'selected-mission-endpoints';
const MISSION_LANDING_SOURCE = 'selected-mission-landing-zone';
/** Approximate landing / LZ clearance radius for map visualization (meters). */
const LANDING_CLEARANCE_METERS = 420;
const ACTIVE_ROUTE_STATUSES = new Set(['assigned', 'in-flight']);

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function circlePolygonGeoJson(centerLng, centerLat, radiusM, steps = 56) {
  const ring = [];
  const latRad = (centerLat * Math.PI) / 180;
  const metersPerDegLat = 111320;
  const metersPerDegLng = 111320 * Math.cos(latRad);

  for (let i = 0; i <= steps; i += 1) {
    const angle = (i / steps) * Math.PI * 2;
    const dxM = radiusM * Math.cos(angle);
    const dyM = radiusM * Math.sin(angle);
    ring.push([centerLng + dxM / metersPerDegLng, centerLat + dyM / metersPerDegLat]);
  }

  return {
    type: 'Feature',
    properties: { kind: 'landing_clearance' },
    geometry: {
      type: 'Polygon',
      coordinates: [ring],
    },
  };
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

function buildMissionOverlayGeoJson(mission, selectedAircraft) {
  if (!mission) {
    return {
      routes: { type: 'FeatureCollection', features: [] },
      endpoints: { type: 'FeatureCollection', features: [] },
      landingZone: { type: 'FeatureCollection', features: [] },
    };
  }

  const hasLiveAircraftPosition =
    selectedAircraft &&
    Number.isFinite(Number(selectedAircraft.lng)) &&
    Number.isFinite(Number(selectedAircraft.lat));
  const routeStartLng = hasLiveAircraftPosition
    ? Number(selectedAircraft.lng)
    : Number(mission.origin_lng);
  const routeStartLat = hasLiveAircraftPosition
    ? Number(selectedAircraft.lat)
    : Number(mission.origin_lat);

  const destLng = Number(mission.dest_lng);
  const destLat = Number(mission.dest_lat);

  return {
    routes: {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {
            mission_id: mission.mission_id,
            priority: mission.priority || 'normal',
          },
          geometry: {
            type: 'LineString',
            coordinates: [
              [routeStartLng, routeStartLat],
              [destLng, destLat],
            ],
          },
        },
      ],
    },
    endpoints: {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {
            mission_id: mission.mission_id,
            priority: mission.priority || 'normal',
            endpoint_type: 'origin',
            endpoint_label: 'START',
          },
          geometry: {
            type: 'Point',
            coordinates: [Number(mission.origin_lng), Number(mission.origin_lat)],
          },
        },
        {
          type: 'Feature',
          properties: {
            mission_id: mission.mission_id,
            priority: mission.priority || 'normal',
            endpoint_type: 'destination',
            endpoint_label: 'LZ',
          },
          geometry: {
            type: 'Point',
            coordinates: [destLng, destLat],
          },
        },
      ],
    },
    landingZone: {
      type: 'FeatureCollection',
      features: [circlePolygonGeoJson(destLng, destLat, LANDING_CLEARANCE_METERS)],
    },
  };
}

function FleetMap({ fleetState, socket, isAuthenticated }) {
  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;
  const { missionsList } = useMissionSocket(socket, isAuthenticated);
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerStoreRef = useRef(new Map());
  const rafRef = useRef(0);
  const selectedAircraftIdRef = useRef(null);
  const selectedMissionRef = useRef(null);

  const [selectedAircraftId, setSelectedAircraftId] = useState(null);
  const lastTriggerRef = useRef(null);

  const aircraftRows = useMemo(() => {
    const list = Object.values(fleetState || {});
    const merged = dedupeFleetRowsByTail(list);
    return merged.sort((a, b) => a.tail_number.localeCompare(b.tail_number));
  }, [fleetState]);
  const aircraftCount = aircraftRows.length;
  const activeMissions = useMemo(
    () =>
      missionsList.filter(
        (mission) =>
          ACTIVE_ROUTE_STATUSES.has(mission.status) &&
          Number.isFinite(Number(mission.origin_lat)) &&
          Number.isFinite(Number(mission.origin_lng)) &&
          Number.isFinite(Number(mission.dest_lat)) &&
          Number.isFinite(Number(mission.dest_lng))
      ),
    [missionsList]
  );
  const selectedAircraft = useMemo(
    () => aircraftRows.find((row) => row.aircraft_id === selectedAircraftId) || null,
    [aircraftRows, selectedAircraftId]
  );
  const selectedActiveMission = useMemo(
    () => activeMissions.find((mission) => mission.aircraft_id === selectedAircraftId) || null,
    [activeMissions, selectedAircraftId]
  );

  useEffect(() => {
    selectedAircraftIdRef.current = selectedAircraftId;
  }, [selectedAircraftId]);

  useEffect(() => {
    selectedMissionRef.current = selectedActiveMission;
  }, [selectedActiveMission]);

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

      map.addSource(MISSION_LANDING_SOURCE, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      map.addLayer({
        id: 'mission-landing-fill',
        type: 'fill',
        source: MISSION_LANDING_SOURCE,
        paint: {
          'fill-color': colors.accent,
          'fill-opacity': colors.mission.landingFillOpacity,
        },
      });
      map.addLayer({
        id: 'mission-landing-outline',
        type: 'line',
        source: MISSION_LANDING_SOURCE,
        paint: {
          'line-color': colors.accent,
          'line-width': 1.5,
          'line-opacity': colors.mission.landingOutlineOpacity,
        },
      });

      map.addSource(MISSION_ROUTE_SOURCE, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      map.addLayer({
        id: 'mission-routes-layer',
        type: 'line',
        source: MISSION_ROUTE_SOURCE,
        paint: {
          'line-color': colors.accent,
          'line-width': 2.5,
          'line-opacity': 0.95,
        },
      });

      map.addSource(MISSION_ENDPOINT_SOURCE, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      map.addLayer({
        id: 'mission-endpoints-circle',
        type: 'circle',
        source: MISSION_ENDPOINT_SOURCE,
        paint: {
          'circle-radius': [
            'match',
            ['get', 'endpoint_type'],
            'origin',
            8,
            'destination',
            10,
            8,
          ],
          'circle-color': [
            'match',
            ['get', 'endpoint_type'],
            'origin',
            colors.mission.endpointFillOrigin,
            'destination',
            colors.mission.endpointFillDestination,
            colors.mission.endpointFillFallback,
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': colors.accent,
        },
      });
      map.addLayer({
        id: 'mission-endpoint-labels',
        type: 'symbol',
        source: MISSION_ENDPOINT_SOURCE,
        layout: {
          'text-field': ['get', 'endpoint_label'],
          'text-size': 11,
          'text-offset': [0, 1.35],
          'text-anchor': 'top',
          'text-allow-overlap': true,
        },
        paint: {
          'text-color': colors.text.secondary,
          'text-halo-color': colors.bg.primary,
          'text-halo-width': 1,
        },
      });
    });

    const animate = () => {
      markerStore.forEach((entry) => {
        const dLng = entry.targetLng - entry.currentLng;
        const dLat = entry.targetLat - entry.currentLat;

        // If jump is large (status transition/route switch), snap to target.
        if (Math.abs(dLng) + Math.abs(dLat) > 0.028) {
          entry.currentLng = entry.targetLng;
          entry.currentLat = entry.targetLat;
        } else {
          entry.currentLng += dLng * LERP;
          entry.currentLat += dLat * LERP;
        }

        entry.marker.setLngLat([entry.currentLng, entry.currentLat]);
      });

      const selectedMission = selectedMissionRef.current;
      const selectedAircraftIdCurrent = selectedAircraftIdRef.current;
      if (selectedMission && selectedAircraftIdCurrent) {
        const selectedEntry = markerStore.get(selectedAircraftIdCurrent);
        const routeSource = map.getSource(MISSION_ROUTE_SOURCE);
        if (selectedEntry && routeSource) {
          const dynamicRoute = {
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                properties: {
                  mission_id: selectedMission.mission_id,
                  priority: selectedMission.priority || 'normal',
                },
                geometry: {
                  type: 'LineString',
                  coordinates: [
                    [Number(selectedEntry.currentLng), Number(selectedEntry.currentLat)],
                    [Number(selectedMission.dest_lng), Number(selectedMission.dest_lat)],
                  ],
                },
              },
            ],
          };
          routeSource.setData(dynamicRoute);
        }
      }

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

    const { routes, endpoints, landingZone } = buildMissionOverlayGeoJson(
      selectedActiveMission,
      selectedAircraft
    );
    const routeSource = map.getSource(MISSION_ROUTE_SOURCE);
    if (routeSource) {
      routeSource.setData(routes);
    }

    const endpointSource = map.getSource(MISSION_ENDPOINT_SOURCE);
    if (endpointSource) {
      endpointSource.setData(endpoints);
    }

    const landingSource = map.getSource(MISSION_LANDING_SOURCE);
    if (landingSource) {
      landingSource.setData(landingZone);
    }
  }, [selectedActiveMission, selectedAircraft]);

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
      const isSelected = aircraftId === selectedAircraftId;
      if (isSelected) {
        entry.element.classList.add('fleet-marker--selected');
      } else {
        entry.element.classList.remove('fleet-marker--selected');
      }

      // Focus mode: when one aircraft is selected, hide all other markers to reduce noise.
      entry.element.style.visibility = selectedAircraftId && !isSelected ? 'hidden' : 'visible';
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

      <div
        className={`fleet-map-stack ${selectedAircraftId ? 'fleet-map-stack--split' : ''}`}
      >
        <div className="fleet-map-map-area">
          <div ref={mapContainerRef} className="fleet-map-canvas" />

          <aside className="fleet-map-overlay" aria-label="Map status panel">
            <p className="zone-pill">DFW Class B - Active</p>
            <p className="zone-count">Aircraft online: {aircraftCount}</p>
            <p className="zone-count" aria-live="polite" aria-atomic="true">
              Active missions: {activeMissions.length}
            </p>
          </aside>
        </div>

        {selectedAircraft ? (
          <DetailPanel
            variant="dock"
            aircraft={selectedAircraft}
            isOpen
            onClose={closeDetailPanel}
          />
        ) : null}
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
              setSelectedAircraftId((current) =>
                current === aircraft.aircraft_id ? null : aircraft.aircraft_id
              );
            }}
          >
            {aircraft.tail_number}
          </button>
        ))}
      </div>

      <p className="fleet-map-selection" aria-live="polite">
        {selectedAircraft
          ? selectedActiveMission
            ? `Selected ${selectedAircraft.tail_number} (${selectedAircraft.status}, ${selectedAircraft.battery_pct}%). Mission route, START and LZ markers, and landing clearance circle shown on map.`
            : `Selected ${selectedAircraft.tail_number} (${selectedAircraft.status}, ${selectedAircraft.battery_pct}%). No active dispatched mission for this aircraft.`
          : 'Select an aircraft marker or chip to inspect its live state.'}
      </p>

      <ul className="visually-hidden" aria-label="Active mission routes">
        {(selectedActiveMission ? [selectedActiveMission] : []).map((mission) => (
          <li key={mission.mission_id}>
            Mission {mission.mission_id} {mission.status} priority {mission.priority}. Start{' '}
            {Number(mission.origin_lat).toFixed(4)}, {Number(mission.origin_lng).toFixed(4)}. Landing zone{' '}
            {Number(mission.dest_lat).toFixed(4)}, {Number(mission.dest_lng).toFixed(4)} with approximate{' '}
            {LANDING_CLEARANCE_METERS} meter clearance circle.
          </li>
        ))}
      </ul>

    </section>
  );
}

export default FleetMap;
