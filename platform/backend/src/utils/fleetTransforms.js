function mergeWithLiveState(aircraftRow, fleetState) {
  const live = fleetState[aircraftRow.id] || {};

  return {
    id: aircraftRow.id,
    tail_number: aircraftRow.tail_number,
    type: aircraftRow.type,
    model: aircraftRow.model,
    operator: aircraftRow.operator,
    lat: live.lat ?? null,
    lng: live.lng ?? null,
    altitude_ft: live.altitude_ft ?? null,
    speed_kts: live.speed_kts ?? null,
    heading_deg: live.heading_deg ?? null,
    battery_pct: live.battery_pct ?? null,
    status: live.status ?? 'unknown',
    last_update: live.timestamp ?? null,
  };
}

module.exports = {
  mergeWithLiveState,
};
