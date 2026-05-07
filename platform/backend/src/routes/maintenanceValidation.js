const EVENT_TYPES = new Set(['scheduled', 'unscheduled', 'inspection', 'note']);
const DUE_KINDS = new Set(['hours', 'calendar', 'battery_cycles']);

function validateEventPayload(payload) {
  const eventType = payload.event_type;
  const summary = (payload.summary || '').trim();

  if (!EVENT_TYPES.has(eventType)) {
    return {
      valid: false,
      error: "event_type must be 'scheduled', 'unscheduled', 'inspection', or 'note'",
    };
  }

  if (!summary || summary.length < 1 || summary.length > 200) {
    return { valid: false, error: 'summary is required and must be 1–200 characters' };
  }

  let performedAt = null;
  if (payload.performed_at) {
    const d = new Date(payload.performed_at);
    if (Number.isNaN(d.getTime())) {
      return { valid: false, error: 'performed_at must be a valid ISO timestamp' };
    }
    performedAt = d;
  }

  return {
    valid: true,
    value: {
      eventType,
      summary,
      details: payload.details || null,
      performedAt,
    },
  };
}

function validateDuePayload(payload) {
  const kind = payload.kind;

  if (!DUE_KINDS.has(kind)) {
    return {
      valid: false,
      error: "kind must be 'hours', 'calendar', or 'battery_cycles'",
    };
  }

  let dueAt = null;
  if (payload.due_at) {
    const d = new Date(payload.due_at);
    if (Number.isNaN(d.getTime())) {
      return { valid: false, error: 'due_at must be a valid ISO timestamp' };
    }
    dueAt = d;
  }

  let dueAfterMinutes = null;
  if (payload.due_after_minutes !== undefined && payload.due_after_minutes !== null) {
    const n = Number(payload.due_after_minutes);
    if (!Number.isFinite(n) || n <= 0) {
      return { valid: false, error: 'due_after_minutes must be a positive number' };
    }
    dueAfterMinutes = n;
  }

  if (!dueAt && !dueAfterMinutes) {
    return { valid: false, error: 'either due_at or due_after_minutes is required' };
  }

  return {
    valid: true,
    value: {
      kind,
      label: (payload.label || '').trim() || null,
      dueAt,
      dueAfterMinutes,
    },
  };
}

module.exports = { validateEventPayload, validateDuePayload };
