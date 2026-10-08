import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

let memoryServer = null;

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (uri) {
    try {
      console.log('[MongoDB] Connecting to MongoDB Atlas...');
      const conn = await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 6000,
      });
      console.log(`[MongoDB Atlas] Connected successfully to host: ${conn.connection.host}, database: ${conn.connection.name}`);
      return conn;
    } catch (atlasError) {
      console.warn(`[MongoDB Atlas Notice] Atlas connection failed (Likely IP Whitelist 0.0.0.0/0 needed in Atlas Network Access): ${atlasError.message}`);
    }
  }

  // Fallback to in-memory MongoDB for local resilience if Atlas connection blocked by network/whitelist
  try {
    console.log('[MongoDB Fallback] Initializing local memory database for seamless offline development...');
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    memoryServer = await MongoMemoryServer.create({
      instance: { dbName: 'spendflow_ai' },
    });
    const memoryUri = memoryServer.getUri();
    const conn = await mongoose.connect(memoryUri);
    console.log(`[MongoDB Fallback] Connected to in-memory database: ${memoryUri}`);
    return conn;
  } catch (memError) {
    console.error(`[MongoDB Fatal Error] Could not connect to database: ${memError.message}`);
  }
};

export default connectDB;
