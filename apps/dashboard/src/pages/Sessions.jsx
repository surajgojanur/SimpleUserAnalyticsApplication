import { useCallback, useState } from 'react';
import { api } from '../services/api.js';
import { useAsync } from '../hooks/useAsync.js';
import EventTimeline from '../components/EventTimeline.jsx';
import StateMessage from '../components/StateMessage.jsx';
const pageSize = 10;
export default function Sessions({ siteId }) {
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState('');
  const list = useAsync(
    useCallback(
      (signal) => api.sessions(siteId, { page, limit: pageSize }, signal),
      [siteId, page],
    ),
  );
  const journey = useAsync(
    useCallback(
      (signal) => (selected ? api.sessionEvents(siteId, selected, signal) : null),
      [siteId, selected],
    ),
  );
  const totalPages = Math.max(1, Math.ceil((list.data?.total || 0) / pageSize));
  function changePage(next) {
    setPage(next);
    setSelected('');
  }
  return (
    <>
      <div className="mb-6">
        <p className="eyebrow">Visitor activity</p>
        <h2 className="mt-1 text-2xl font-semibold">Sessions</h2>
        <p className="mt-2 text-sm text-slate-500">
          Explore event counts and follow each visitor’s ordered journey.
        </p>
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <section className="panel min-w-0" aria-label="Visitor sessions">
          <div className="mb-4 flex justify-between">
            <h3 className="font-semibold">Visitor sessions</h3>
            <span className="text-sm text-slate-500">
              {list.data ? `${list.data.total} total` : '—'}
            </span>
          </div>
          {list.loading && <StateMessage>Loading sessions…</StateMessage>}
          {list.error && <StateMessage error>Unable to load sessions: {list.error}</StateMessage>}
          {!list.loading && list.data?.sessions.length === 0 && (
            <StateMessage>No sessions yet. Visit the demo site to start tracking.</StateMessage>
          )}
          {!list.loading && !!list.data?.sessions.length && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-xs text-slate-500">
                  <tr>
                    <th className="pb-3">Session</th>
                    <th className="pb-3">Events</th>
                    <th className="pb-3">Last seen</th>
                  </tr>
                </thead>
                <tbody>
                  {list.data.sessions.map((session) => (
                    <tr
                      key={session.session_id}
                      className={`border-b border-slate-100 ${selected === session.session_id ? 'bg-blue-50' : ''}`}
                    >
                      <td className="py-3 pr-3">
                        <button
                          aria-label={`View session ${session.session_id}`}
                          className="font-mono text-blue-700 hover:underline"
                          onClick={() => setSelected(session.session_id)}
                        >
                          {session.session_id.slice(0, 8)}
                        </button>
                        <p className="mt-1 text-xs text-slate-500">
                          {session.page_views} views · {session.clicks} clicks
                        </p>
                      </td>
                      <td className="pr-3 font-semibold">{session.event_count}</td>
                      <td className="text-xs text-slate-500">
                        {new Date(session.last_seen_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-5 flex items-center justify-between gap-2 text-xs">
            <button
              className="control disabled:opacity-40"
              disabled={list.loading || !!list.error || page <= 1}
              onClick={() => changePage(page - 1)}
            >
              Previous
            </button>
            <span>
              Page {page} of {totalPages}
            </span>
            <button
              className="control disabled:opacity-40"
              disabled={list.loading || !!list.error || page >= totalPages}
              onClick={() => changePage(page + 1)}
            >
              Next
            </button>
          </div>
        </section>
        <section className="panel min-w-0" aria-label="User journey">
          <h3 className="mb-4 font-semibold">User journey</h3>
          {!selected && <StateMessage>Select a session to see its events.</StateMessage>}
          {selected && (
            <p className="mb-4 break-all font-mono text-xs text-slate-500">{selected}</p>
          )}
          {selected && journey.loading && <StateMessage>Loading journey…</StateMessage>}
          {journey.error && (
            <StateMessage error>Unable to load journey: {journey.error}</StateMessage>
          )}
          {selected && !journey.loading && journey.data && (
            <EventTimeline events={journey.data.events} />
          )}
        </section>
      </div>
    </>
  );
}
