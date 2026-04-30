import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { colors } from '../design/tokens';

const SOURCE_ROUTE = 'dispatch-preview-route';
const SOURCE_ENDPOINTS = 'dispatch-preview-endpoints';

export default function RoutePreviewMap({ originLat, originLng, destLat, destLng }) {
  const containerRef = useRef(null);
  const token = import.meta.env.VITE_MAPBOX_TOKEN;

  useEffect(() => {
    if (!token || !containerRef.current) return undefined;

    mapboxgl.accessToken = token;

    const midLng = (originLng + destLng) / 2;
    const midLat = (originLat + destLat) / 2;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [midLng, midLat],
      zoom: 8,
      attributionControl: true,
    });

    let resizeObserver;
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        map.resize();
      });
      resizeObserver.observe(containerRef.current);
    }

    const lineData = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: [
          [originLng, originLat],
          [destLng, destLat],
        ],
      },
    };

    const pointsData = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { kind: 'start' },
          geometry: { type: 'Point', coordinates: [originLng, originLat] },
        },
        {
          type: 'Feature',
          properties: { kind: 'end' },
          geometry: { type: 'Point', coordinates: [destLng, destLat] },
        },
      ],
    };

    map.on('load', () => {
      map.addSource(SOURCE_ROUTE, { type: 'geojson', data: lineData });
      map.addLayer({
        id: `${SOURCE_ROUTE}-line`,
        type: 'line',
        source: SOURCE_ROUTE,
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
        paint: {
          'line-color': colors.accent,
          'line-width': 3,
          'line-opacity': 0.9,
        },
      });

      map.addSource(SOURCE_ENDPOINTS, { type: 'geojson', data: pointsData });
      map.addLayer({
        id: `${SOURCE_ENDPOINTS}-start`,
        type: 'circle',
        source: SOURCE_ENDPOINTS,
        filter: ['==', ['get', 'kind'], 'start'],
        paint: {
          'circle-radius': 7,
          'circle-color': colors.text.secondary,
          'circle-stroke-width': 2,
          'circle-stroke-color': colors.bg.panel,
        },
      });
      map.addLayer({
        id: `${SOURCE_ENDPOINTS}-end`,
        type: 'circle',
        source: SOURCE_ENDPOINTS,
        filter: ['==', ['get', 'kind'], 'end'],
        paint: {
          'circle-radius': 7,
          'circle-color': colors.accent,
          'circle-stroke-width': 2,
          'circle-stroke-color': colors.bg.panel,
        },
      });

      const minLng = Math.min(originLng, destLng);
      const maxLng = Math.max(originLng, destLng);
      const minLat = Math.min(originLat, destLat);
      const maxLat = Math.max(originLat, destLat);
      map.fitBounds(
        [
          [minLng, minLat],
          [maxLng, maxLat],
        ],
        { padding: 40, duration: 0, maxZoom: 11 }
      );
    });

    return () => {
      resizeObserver?.disconnect();
      map.remove();
    };
  }, [token, originLat, originLng, destLat, destLng]);

  if (!token) {
    return (
      <div className="dispatch-preview-map dispatch-preview-map--placeholder">
        <p className="dispatch-preview-map__placeholder-copy">
          Set <code>VITE_MAPBOX_TOKEN</code> to preview the route on a map.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="dispatch-preview-map"
      role="img"
      aria-label="Map preview: aircraft position, destination, and planned path"
    />
  );
}
