import mongoose from 'mongoose';
const schema = new mongoose.Schema(
  {
    _id: String,
    name: { type: String, required: true },
    allowed_origins: { type: [String], default: [] },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } },
);
export default mongoose.model('Site', schema);
