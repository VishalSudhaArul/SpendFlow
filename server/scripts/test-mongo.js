import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI;

console.log('Testing connection to MongoDB...');
console.log('URI configured:', uri ? 'Yes (URI Present)' : 'No');

async function testConnection() {
  try {
    const conn = await mongoose.connect(uri);
    console.log(' Successfully connected to MongoDB Atlas!');
    console.log(` Host: ${conn.connection.host}`);
    console.log(` Database: ${conn.connection.name}`);
    
    // Inspect databases
    const adminDb = conn.connection.db.admin();
    const dbs = await adminDb.listDatabases();
    console.log('\n Available Databases on Atlas cluster:');
    dbs.databases.forEach(db => {
      console.log(`  - ${db.name} (${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB)`);
    });

    // Inspect collections in current db
    const collections = await conn.connection.db.listCollections().toArray();
    console.log(`\n Collections in '${conn.connection.name}':`);
    if (collections.length === 0) {
      console.log('  (No collections yet - clean slate for SpendFlow AI)');
    } else {
      collections.forEach(col => {
        console.log(`  - ${col.name}`);
      });
    }

    // Inspect collections in 'spendflow' (if any other db exists)
    try {
      const defaultDb = conn.connection.client.db('spendflow');
      const defaultCols = await defaultDb.listCollections().toArray();
      console.log(`\n Collections in 'spendflow' database:`);
      if (defaultCols.length === 0) {
        console.log('  (No collections in spendflow db)');
      } else {
        defaultCols.forEach(col => {
          console.log(`  - ${col.name}`);
        });
      }
    } catch (e) {
      console.log('Could not inspect spendflow db:', e.message);
    }

    await mongoose.disconnect();
    console.log('\n MongoDB verification completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error(' MongoDB Connection Error:', error);
    process.exit(1);
  }
}

testConnection();
