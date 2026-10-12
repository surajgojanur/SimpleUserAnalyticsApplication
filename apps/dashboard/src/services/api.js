const base = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');
async function get(path, params = {}, signal) {
  const url = new URL(base + path);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  const response = await fetch(url, { signal, credentials: 'omit' });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${response.status})`);
  }
  return response.json();
}
const sitePath = (id) => `/api/sites/${encodeURIComponent(id)}`;
export const api = {
  sites: (signal) => get('/api/sites', {}, signal),
  sessions: (siteId, params, signal) => get(`${sitePath(siteId)}/sessions`, params, signal),
  sessionEvents: (siteId, id, signal) =>
    get(`${sitePath(siteId)}/sessions/${encodeURIComponent(id)}/events`, {}, signal),
  pages: (siteId, signal) => get(`${sitePath(siteId)}/pages`, {}, signal),
  heatmap: (siteId, url, signal) => get(`${sitePath(siteId)}/heatmap`, { url }, signal),
};
