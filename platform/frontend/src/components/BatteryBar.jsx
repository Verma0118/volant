function getBatteryClassName(batteryPct) {
  if (batteryPct < 20) {
    return 'battery-bar__fill--critical';
  }

  if (batteryPct < 40) {
    return 'battery-bar__fill--warning';
  }

  return 'battery-bar__fill--healthy';
}

function BatteryBar({ batteryPct = 0 }) {
  const safeBatteryPct = Math.max(0, Math.min(100, Number(batteryPct) || 0));

  return (
    <div className="battery-bar-wrap">
      <div
        className="battery-bar"
        role="progressbar"
        aria-label="Battery level"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={safeBatteryPct}
      >
        <div
          className={`battery-bar__fill ${getBatteryClassName(safeBatteryPct)}`}
          style={{ width: `${safeBatteryPct}%` }}
        />
      </div>
      <span className="battery-bar__label">{safeBatteryPct}%</span>
    </div>
  );
}

export default BatteryBar;
