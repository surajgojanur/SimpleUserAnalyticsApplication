import Event from '../models/Event.js';
import Site from '../models/Site.js';
import { eventSchema } from '../validators/event.schema.js';
import { httpError } from '../middleware/errorHandler.js';
export async function ingestEvent(req, res) {
  let body;
  try {
    body = JSON.parse(req.body);
  } catch {
    throw httpError(400, 'Body must be valid JSON');
  }
  const data = eventSchema.parse(body);
  const site = await Site.findById(data.site_id).lean();
  if (!site) throw httpError(404, 'Unknown site_id');
  const origin = req.get('Origin');
  if (origin && !site.allowed_origins.includes(origin))
    throw httpError(403, 'Origin not allowed for this site');
  const timestamp = new Date(data.timestamp);
  if (timestamp.getTime() > Date.now() + 300000) throw httpError(400, 'timestamp is in the future');
  try {
    await Event.create({ ...data, timestamp });
  } catch (error) {
    if (error.code === 11000) return res.status(200).json({ ok: true, duplicate: true });
    throw error;
  }
  res.status(202).json({ ok: true });
}
