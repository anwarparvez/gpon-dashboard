// lib/mongodb-client.ts
import mongoose from 'mongoose';
import { connectDB } from './mongodb';

let clientPromise: Promise<any>;

export async function getMongoClientPromise() {
  await connectDB();
  return mongoose.connection.getClient();
}

if (process.env.NODE_ENV === 'development') {
  let globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<any>;
  };
  if (!globalWithMongo._mongoClientPromise) {
    globalWithMongo._mongoClientPromise = getMongoClientPromise();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  clientPromise = getMongoClientPromise();
}

export default clientPromise;