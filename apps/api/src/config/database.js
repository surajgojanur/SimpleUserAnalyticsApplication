import mongoose from 'mongoose';
import Event from '../models/Event.js';

export async function connectDB(uri) {
  if (!uri) throw new Error('MONGODB_URI is required');
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
    // Ensure duplicate protection exists before accepting traffic.
    await Event.init();
  } catch (error) {
    // Driver errors can contain connection credentials. Report only a controlled diagnosis.
    const message = String(error.message || '');
    let reason = 'Check database availability, Atlas Network Access, and TLS connectivity.';
    if (error.code === 18 || /authentication|bad auth/i.test(message))
      reason = 'Authentication failed. Check the database user and URL-encoded password.';
    else if (/ENOTFOUND|EAI_AGAIN|querySrv|queryTxt/i.test(message))
      reason = 'DNS lookup failed. Check the cluster hostname and DNS resolver.';
    else if (/certificate|TLS|SSL/i.test(message))
      reason = 'TLS connection failed. Check certificates and network connectivity.';
    else if (/URI|connection string|Invalid scheme/i.test(message))
      reason = 'Invalid connection URI. Check its format and URL-encoded credentials.';
    throw new Error(`MongoDB connection or index initialization failed. ${reason}`);
  }
}
