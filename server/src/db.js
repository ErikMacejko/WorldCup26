import mongoose from 'mongoose';
import { config } from './config.js';

export async function connectDb() {
  mongoose.set('strictQuery', true);
  console.log(
    '[db] connecting using MONGO_URI =',
    config.mongoUri.replace(/\/\/[^@]*@/, '//<redacted>@')
  );
  await mongoose.connect(config.mongoUri);
  console.log('[db] connected to MongoDB');
  return mongoose.connection;
}
