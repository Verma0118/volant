/**
 * When Redis fleet:state holds orphan aircraft_id keys, the same tail_number can
 * appear twice; keep the row with the freshest telemetry timestamp.
 */
export function dedupeFleetRowsByTail(rows) {
  const byTail = new Map();
  for (const row of rows) {
    const tail = row.tail_number || '';
    const ts = Date.parse(row.last_update || row.timestamp || '') || 0;
    const prev = byTail.get(tail);
    const prevTs = prev ? Date.parse(prev.last_update || prev.timestamp || '') || 0 : -1;
    if (!prev || ts >= prevTs) {
      byTail.set(tail, row);
    }
  }
  return Array.from(byTail.values());
}
