import mongoose from 'mongoose';
import Event from '../models/Event.js';

export async function connectDB(uri) {
  if (!uri) throw new Error('MONGODB_URI is required');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  // Ensure duplicate protection exists before accepting traffic.
  await Event.init();
}
