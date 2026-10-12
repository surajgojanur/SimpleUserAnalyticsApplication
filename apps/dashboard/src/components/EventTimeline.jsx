import StateMessage from './StateMessage.jsx';
export default function EventTimeline({ events }) {
  if (!events.length) return <StateMessage>No events in this session.</StateMessage>;
  return <ol aria-label="Ordered user journey" className="space-y-3">
    {events.map((event, index) => <li key={event.event_id || index} className="flex gap-3 rounded-lg border border-slate-200 p-4 text-sm">
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-semibold ${event.event_type === 'click' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>{index + 1}</span>
      <div className="min-w-0 flex-1"><div className="flex flex-wrap justify-between gap-2"><strong>{event.event_type === 'click' ? 'Click' : 'Page view'}</strong><time className="text-xs text-slate-500" dateTime={event.timestamp}>{new Date(event.timestamp).toLocaleString()}</time></div>
        <p className="mt-1 break-all font-mono text-xs text-slate-600" title={event.page_url}>{new URL(event.page_url).pathname}</p>
        {event.click && <p className="mt-1 text-xs text-slate-500">Document position: ({event.click.x}, {event.click.y})</p>}
      </div>
    </li>)}
  </ol>;
}
