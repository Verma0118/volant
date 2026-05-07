const test = require('node:test');
const assert = require('node:assert/strict');

const { validateEventPayload, validateDuePayload } = require('./maintenanceValidation');

// --- validateEventPayload ---

test('validateEventPayload accepts valid scheduled event', () => {
  const result = validateEventPayload({
    event_type: 'scheduled',
    summary: '100-hour inspection complete',
  });

  assert.equal(result.valid, true);
  assert.equal(result.value.eventType, 'scheduled');
  assert.equal(result.value.summary, '100-hour inspection complete');
});

test('validateEventPayload rejects unknown event_type', () => {
  const result = validateEventPayload({ event_type: 'overhaul', summary: 'Major work' });
  assert.equal(result.valid, false);
  assert.match(result.error, /event_type/);
});

test('validateEventPayload rejects missing summary', () => {
  const result = validateEventPayload({ event_type: 'note' });
  assert.equal(result.valid, false);
  assert.match(result.error, /summary/);
});

test('validateEventPayload rejects summary over 200 chars', () => {
  const result = validateEventPayload({
    event_type: 'note',
    summary: 'x'.repeat(201),
  });
  assert.equal(result.valid, false);
  assert.match(result.error, /summary/);
});

test('validateEventPayload accepts optional performed_at ISO string', () => {
  const result = validateEventPayload({
    event_type: 'inspection',
    summary: 'Pre-flight check',
    performed_at: '2026-05-01T10:00:00Z',
  });
  assert.equal(result.valid, true);
  assert.ok(result.value.performedAt instanceof Date);
});

test('validateEventPayload rejects malformed performed_at', () => {
  const result = validateEventPayload({
    event_type: 'inspection',
    summary: 'Pre-flight check',
    performed_at: 'not-a-date',
  });
  assert.equal(result.valid, false);
  assert.match(result.error, /performed_at/);
});

// --- validateDuePayload ---

test('validateDuePayload accepts hours kind with due_after_minutes', () => {
  const result = validateDuePayload({ kind: 'hours', due_after_minutes: 6000 });
  assert.equal(result.valid, true);
  assert.equal(result.value.kind, 'hours');
  assert.equal(result.value.dueAfterMinutes, 6000);
});

test('validateDuePayload accepts calendar kind with due_at', () => {
  const result = validateDuePayload({ kind: 'calendar', due_at: '2026-09-01T00:00:00Z' });
  assert.equal(result.valid, true);
  assert.ok(result.value.dueAt instanceof Date);
});

test('validateDuePayload rejects unknown kind', () => {
  const result = validateDuePayload({ kind: 'mileage', due_after_minutes: 1000 });
  assert.equal(result.valid, false);
  assert.match(result.error, /kind/);
});

test('validateDuePayload rejects missing both due_at and due_after_minutes', () => {
  const result = validateDuePayload({ kind: 'hours', label: 'Oil change' });
  assert.equal(result.valid, false);
  assert.match(result.error, /due_at|due_after_minutes/);
});

test('validateDuePayload rejects non-positive due_after_minutes', () => {
  const result = validateDuePayload({ kind: 'battery_cycles', due_after_minutes: -5 });
  assert.equal(result.valid, false);
  assert.match(result.error, /due_after_minutes/);
});
