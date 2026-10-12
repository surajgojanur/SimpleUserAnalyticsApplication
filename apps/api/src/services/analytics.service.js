import Event from '../models/Event.js';
const countIf = (type) => ({ $sum: { $cond: [{ $eq: ['$event_type', type] }, 1, 0] } });
export async function listSessions(siteId, page, limit) {
  const [sessions, totals] = await Promise.all([
    Event.aggregate([
      { $match: { site_id: siteId } },
      { $group: { _id: '$session_id', event_count: { $sum: 1 }, page_views: countIf('page_view'),
        clicks: countIf('click'), started_at: { $min: '$timestamp' }, last_seen_at: { $max: '$timestamp' } } },
      { $sort: { last_seen_at: -1, _id: 1 } },
      { $skip: (page - 1) * limit }, { $limit: limit },
      { $project: { _id: 0, session_id: '$_id', event_count: 1, page_views: 1, clicks: 1, started_at: 1, last_seen_at: 1 } },
    ]),
    Event.aggregate([{ $match: { site_id: siteId } }, { $group: { _id: '$session_id' } }, { $count: 'total' }]),
  ]);
  return { sessions, page, limit, total: totals[0]?.total ?? 0 };
}
export function getSessionEvents(siteId, sessionId) {
  return Event.find({ site_id: siteId, session_id: sessionId }).sort({ timestamp: 1, _id: 1 })
    .select('-_id event_id session_id event_type page_url timestamp click').lean();
}
export function listPages(siteId) {
  return Event.aggregate([
    { $match: { site_id: siteId } },
    { $group: { _id: '$page_url', views: countIf('page_view'), clicks: countIf('click') } },
    { $sort: { clicks: -1, _id: 1 } }, { $project: { _id: 0, page_url: '$_id', views: 1, clicks: 1 } },
  ]);
}
export async function getHeatmap(siteId, pageUrl) {
  const filter = { site_id: siteId, page_url: pageUrl, event_type: 'click' };
  const [total, rows] = await Promise.all([
    Event.countDocuments(filter),
    Event.find(filter).sort({ timestamp: -1, _id: -1 }).limit(5000).select('-_id click').lean(),
  ]);
  return { page_url: pageUrl, total_clicks: total, clicks: rows.map((row) => row.click) };
}
