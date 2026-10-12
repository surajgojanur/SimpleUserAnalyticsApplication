import { useState } from 'react';
import { api } from './services/api.js';
import { useAsync } from './hooks/useAsync.js';
import Sessions from './pages/Sessions.jsx';
import Heatmap from './pages/Heatmap.jsx';
import StateMessage from './components/StateMessage.jsx';
export default function App() {
  const [view, setView] = useState('sessions');
  const [siteId, setSiteId] = useState('');
  const sites = useAsync(api.sites);
  const active = siteId || sites.data?.sites[0]?._id;
  return <div className="min-h-screen">
    <header className="bg-[#17253b] px-6 py-5 text-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
        <div><h1 className="text-xl font-bold tracking-tight">InsightFlow <span className="font-normal text-slate-300">Analytics</span></h1><p className="mt-1 text-xs text-slate-300">Understand the journey behind every click.</p></div>
        <label className="flex items-center gap-3 text-sm">Site <select aria-label="Site" className="control max-w-full text-slate-900" value={active || ''} disabled={sites.loading || !active} onChange={event => setSiteId(event.target.value)}>
          {!active && <option value="">No site selected</option>}
          {sites.data?.sites.map(site => <option key={site._id} value={site._id}>{site.name}</option>)}
        </select></label>
      </div>
    </header>
    <div className="border-b border-slate-200 bg-white"><nav aria-label="Analytics views" className="mx-auto flex max-w-6xl gap-6 px-6">
      {['sessions', 'heatmap'].map(item => <button key={item} aria-pressed={view === item} onClick={() => setView(item)} className={`border-b-2 py-4 text-sm font-semibold capitalize ${view === item ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-900'}`}>{item === 'sessions' ? 'Sessions' : 'Heatmap'}</button>)}
    </nav></div>
    <main className="mx-auto max-w-6xl p-6">
      {sites.loading && <StateMessage>Loading sites…</StateMessage>}
      {sites.error && <StateMessage error>Unable to load sites: {sites.error}. Check the API connection and reload.</StateMessage>}
      {!sites.loading && !sites.error && !active && <StateMessage>No sites found. Run the seed script to create the demo site.</StateMessage>}
      {!sites.loading && !sites.error && active && (view === 'sessions' ? <Sessions key={active} siteId={active} /> : <Heatmap key={active} siteId={active} />)}
    </main>
    <footer className="mx-auto max-w-6xl px-6 pb-8 text-xs text-slate-500">Synthetic demo data · Public analytics API · InsightFlow Analytics</footer>
  </div>;
}
