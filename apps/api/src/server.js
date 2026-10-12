import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from './config/database.js';
import { createApp } from './app.js';
try {
  await connectDB(process.env.MONGODB_URI);
  const port = process.env.PORT || 5000;
  const server = createApp().listen(port, () => console.log(`API listening on ${port}`));
  for (const signal of ['SIGINT', 'SIGTERM'])
    process.once(signal, () => {
      server.close(async () => {
        await mongoose.disconnect();
        process.exit(0);
      });
    });
} catch (error) {
  console.error('API startup failed:', error.message);
  await mongoose.disconnect();
  process.exitCode = 1;
}
