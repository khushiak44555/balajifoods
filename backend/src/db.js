import mongoose from 'mongoose';

mongoose.set('strictQuery', true);

export async function connectDB(uri) {
  if (!uri) {
    throw new Error('MONGODB_URI is not set. Copy backend/.env.example to backend/.env and fill it in.');
  }

  mongoose.connection.on('disconnected', () => console.warn('[db] MongoDB disconnected'));
  mongoose.connection.on('reconnected', () => console.log('[db] MongoDB reconnected'));
  mongoose.connection.on('error', (err) => console.error('[db] MongoDB error:', err.message));

  // Venue Wi-Fi can be flaky: retry a few times before giving up.
  const attempts = 5;
  for (let i = 1; ; i++) {
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 20000 });
      break;
    } catch (err) {
      if (i >= attempts || err.name === 'MongoParseError') throw err;
      console.warn(`[db] Connection attempt ${i}/${attempts} failed (${err.name}); retrying in 3s`);
      await mongoose.disconnect().catch(() => {});
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
  // Make sure indexes (e.g. unique orderNumber) exist before taking orders.
  await mongoose.connection.syncIndexes();
  console.log(`[db] Connected to MongoDB database "${mongoose.connection.name}"`);
}

export function disconnectDB() {
  return mongoose.disconnect();
}
