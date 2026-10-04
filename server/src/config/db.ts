import mongoose from 'mongoose';

/** The only place that knows how to connect. Swap databases by changing MONGODB_URI. */
export async function connectDb(uri: string): Promise<typeof mongoose> {
  mongoose.set('strictQuery', true);
  return mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });
}
