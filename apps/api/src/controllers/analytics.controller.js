import { z } from 'zod';
import Site from '../models/Site.js';
import * as analytics from '../services/analytics.service.js';
import { pageUrlSchema } from '../validators/event.schema.js';
import { httpError } from '../middleware/errorHandler.js';
const pagination = z.object({
  page: z.coerce.number().int().min(1).max(1000000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
async function requireSite(id) {
  if (!(await Site.exists({ _id: id }))) throw httpError(404, 'Site not found');
}
export async function sites(req, res) {
  res.json({ sites: await Site.find().sort({ name: 1, _id: 1 }).select('name').lean() });
}
export async function sessions(req, res) {
  await requireSite(req.params.siteId);
  const { page, limit } = pagination.parse(req.query);
  res.json(await analytics.listSessions(req.params.siteId, page, limit));
}
export async function sessionEvents(req, res) {
  const { siteId, sessionId } = req.params;
  await requireSite(siteId);
  const events = await analytics.getSessionEvents(siteId, sessionId);
  if (!events.length) throw httpError(404, 'Session not found');
  res.json({ session_id: sessionId, events });
}
export async function pages(req, res) {
  await requireSite(req.params.siteId);
  res.json({ pages: await analytics.listPages(req.params.siteId) });
}
export async function heatmap(req, res) {
  await requireSite(req.params.siteId);
  const { url } = z.object({ url: pageUrlSchema }).parse(req.query);
  res.json(await analytics.getHeatmap(req.params.siteId, url));
}
