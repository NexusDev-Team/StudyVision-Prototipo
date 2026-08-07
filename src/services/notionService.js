// Mock Notion integration — simulates network latency, no real API call yet.
// TODO: replace with real Notion API (OAuth + pages.create) when backend exists.
export function exportToNotion(item) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ pageUrl: `https://notion.so/mock-${item.id}`, exportedAt: Date.now() });
    }, 900);
  });
}
