/** Demo scenario: N308VL charging arc before dispatch (investor recording). */
export function isN308DemoChargingHighlight(aircraft) {
  if (!aircraft || aircraft.tail_number !== 'N308VL') {
    return false;
  }
  if (aircraft.status !== 'charging') {
    return false;
  }
  const battery = Number(aircraft.battery_pct);
  return Number.isFinite(battery) && battery < 85;
}
