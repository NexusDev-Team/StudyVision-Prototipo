// Mock Calendário integration — simulates network latency, no real API call yet.
// TODO: replace with real calendar API (OAuth + events.insert) when backend exists.
export function createEvent({ type, date, time }) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ id: `cal_${Date.now()}`, type, date, time, createdAt: Date.now() });
    }, 200);
  });
}

export function scheduleReviews({ event, reminders }) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        eventId: event?.id || `cal_${Date.now()}`,
        reminders: reminders.map(days => ({ days, scheduledAt: Date.now() })),
      });
    }, 150);
  });
}
