import { useCallback, useState } from 'react';
import { api } from '../services/api.js';
import { useAsync } from '../hooks/useAsync.js';
import ClickHeatmap from '../components/ClickHeatmap.jsx';
import StateMessage from '../components/StateMessage.jsx';
export default function Heatmap({ siteId }) {
  const [selectedUrl, setSelectedUrl] = useState('');
  const [device, setDevice] = useState('all');
  const [mode, setMode] = useState('heat');
  const pages = useAsync(useCallback(signal => api.pages(siteId, signal), [siteId]));
  const url = selectedUrl || pages.data?.pages[0]?.page_url || '';
  const map = useAsync(useCallback(signal => url ? api.heatmap(siteId, url, signal) : null, [siteId, url]));
  const clicks = (map.data?.clicks || []).filter(click => device === 'all' || (device === 'mobile' ? click.viewport_width < 768 : click.viewport_width >= 768));
  return <>
    <div className="mb-6"><p className="eyebrow">Interaction patterns</p><h2 className="mt-1 text-2xl font-semibold">Click heatmap</h2><p className="mt-2 text-sm text-slate-500">See where visitors interact across the full document.</p></div>
    <section className="panel">
      <div className="mb-6 flex flex-wrap items-end gap-4">
        <label className="min-w-0 flex-1 text-xs font-medium text-slate-600">Page URL<select aria-label="Page URL" value={url} disabled={pages.loading || !url} onChange={event => setSelectedUrl(event.target.value)} className="control mt-2 block w-full"><option value="" disabled>Select a page</option>{pages.data?.pages.map(page => <option key={page.page_url} value={page.page_url}>{page.page_url} ({page.clicks} clicks)</option>)}</select></label>
        <label className="text-xs font-medium text-slate-600">Device<select aria-label="Device" className="control mt-2 block" value={device} onChange={event => setDevice(event.target.value)}><option value="all">All devices</option><option value="desktop">Desktop</option><option value="mobile">Mobile</option></select></label>
        <label className="text-xs font-medium text-slate-600">Display<select aria-label="Display" className="control mt-2 block" value={mode} onChange={event => setMode(event.target.value)}><option value="heat">Heat</option><option value="dots">Dots</option></select></label>
      </div>
      {pages.loading && <StateMessage>Loading pages…</StateMessage>}
      {pages.error && <StateMessage error>Unable to load pages: {pages.error}</StateMessage>}
      {!pages.loading && pages.data?.pages.length === 0 && <StateMessage>No pages tracked yet.</StateMessage>}
      {url && map.loading && <StateMessage>Loading click data…</StateMessage>}
      {map.error && <StateMessage error>Unable to load click data: {map.error}</StateMessage>}
      {!map.loading && map.data && (clicks.length ? <div className="max-h-[650px] overflow-auto"><ClickHeatmap clicks={clicks} mode={mode} /></div> : <StateMessage>No clicks recorded for this selection.</StateMessage>)}
      <p className="mt-5 text-sm text-slate-500" data-testid="click-summary">{!map.loading && map.data ? `${clicks.length} clicks shown · ${map.data.total_clicks} total for this page.` : 'Choose a page to explore click positions.'}</p>
      <p className="mt-2 max-w-3xl text-xs leading-relaxed text-slate-500">Each click is scaled by its own document size. The map is approximate across different layouts. Mobile means viewport width below 768 px. Results include at most the latest 5,000 clicks; filters apply to those results.</p>
    </section>
  </>;
}
