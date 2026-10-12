import mongoose from 'mongoose';
const clickSchema = new mongoose.Schema({
  x: Number, y: Number,
  viewport_width: Number, viewport_height: Number,
  document_width: Number, document_height: Number,
}, { _id: false });
const schema = new mongoose.Schema({
  site_id: { type: String, required: true },
  event_id: { type: String, required: true },
  session_id: { type: String, required: true },
  event_type: { type: String, enum: ['page_view', 'click'], required: true },
  page_url: { type: String, required: true },
  timestamp: { type: Date, required: true },
  received_at: { type: Date, default: Date.now },
  click: clickSchema,
});
schema.index({ site_id: 1, session_id: 1, timestamp: 1 });
schema.index({ site_id: 1, page_url: 1, event_type: 1 });
schema.index({ site_id: 1, event_id: 1 }, { unique: true });
export default mongoose.model('Event', schema);
