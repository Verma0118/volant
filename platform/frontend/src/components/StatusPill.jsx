const STATUS_TO_LABEL = {
  'in-flight': 'In Flight',
  charging: 'Charging',
  maintenance: 'Maintenance',
  grounded: 'Grounded',
  ready: 'Ready',
};

const STATUS_TO_CLASS = {
  'in-flight': 'status-pill--inflight',
  charging: 'status-pill--charging',
  maintenance: 'status-pill--maintenance',
  grounded: 'status-pill--grounded',
  ready: 'status-pill--ready',
};

function StatusPill({ status }) {
  const normalized = status || 'ready';
  const label = STATUS_TO_LABEL[normalized] || normalized;
  const className = STATUS_TO_CLASS[normalized] || STATUS_TO_CLASS.ready;

  return <span className={`status-pill ${className}`}>{label}</span>;
}

export default StatusPill;
