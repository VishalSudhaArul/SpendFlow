/**
 * Verifies the MongoDB Atlas configuration in server/.env.
 * Usage: npm run db:check
 * Prints only the database name, server version and latency — never the connection string.
 */
import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import { connectDatabase, disconnectDatabase, pingDatabase } from '../src/config/db.js';

async function main() {
  console.log('Checking MongoDB Atlas connection...');
  try {
    const connection = await connectDatabase();
    const latency = await pingDatabase();
    const { version } = await connection.db.admin().command({ buildInfo: 1 });
    const isAtlas = /\.mongodb\.net$/i.test(connection.host ?? '');

    console.log('✔ Connected');
    console.log(`  Database:       ${connection.name}`);
    console.log(`  MongoDB server: ${version}`);
    console.log(`  Ping latency:   ${latency} ms`);
    console.log(`  Atlas cluster:  ${isAtlas ? 'yes' : 'NO — this does not look like an Atlas host'}`);
    console.log(`  Mongoose:       ${mongoose.version}`);
    await disconnectDatabase();
    process.exit(isAtlas ? 0 : 2);
  } catch (error) {
    console.error(`✖ ${error.message}`);
    if (!env.MONGODB_URI) console.error('  Create server/.env from server/.env.example and set MONGODB_URI.');
    await disconnectDatabase().catch(() => {});
    process.exit(1);
  }
}

main();
