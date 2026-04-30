export const colors = {
  bg: {
    primary: '#EEF2F6',
    secondary: '#262626',
    panel: '#FDFDFD',
    border: '#A0A0A0',
  },
  status: {
    inflight: '#C5B382',
    charging: '#A0A0A0',
    maintenance: '#262626',
    grounded: '#262626',
    ready: '#A0A0A0',
  },
  text: {
    primary: '#0A0A0A',
    secondary: '#262626',
    muted: '#A0A0A0',
  },
  accent: '#C5B382',
  mission: {
    endpointFillOrigin: 'rgba(197, 179, 130, 0.22)',
    endpointFillDestination: 'rgba(197, 179, 130, 0.38)',
    endpointFillFallback: 'rgba(197, 179, 130, 0.3)',
    landingFillOpacity: 0.09,
    landingOutlineOpacity: 0.55,
  },
  /** Fleet map: approximate drone / low-altitude ops envelope (demo visualization). */
  map: {
    droneOpsFill: 'rgba(239, 68, 68, 0.06)',
    droneOpsOutline: '#ef4444',
  },
};

export const fonts = {
  data: "'JetBrains Mono', monospace",
  ui: "'Inter', sans-serif",
};
