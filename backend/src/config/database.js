const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

let localMongoServer = null;

const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is required');
  }

  let mongoUri = process.env.MONGO_URI;
  const useEmbeddedMongo =
    process.env.NODE_ENV === 'development' &&
    mongoUri.includes('mongodb://localhost');

  if (useEmbeddedMongo) {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    const dbPath = path.resolve(__dirname, '../../../.local-mongodb/data');
    const downloadDir = path.resolve(__dirname, '../../node_modules/.cache/mongodb-memory-server');
    fs.mkdirSync(dbPath, { recursive: true });

    localMongoServer = await MongoMemoryServer.create({
      instance: {
        dbPath,
        dbName: 'valorant-bgm-player',
        port: 27017,
        portGeneration: false,
        storageEngine: 'wiredTiger',
      },
      binary: {
        version: '8.2.6',
        downloadDir,
      },
    });
    mongoUri = localMongoServer.getUri('valorant-bgm-player');
    console.log(`Embedded MongoDB Started: ${dbPath}`);
  }

  const conn = await mongoose.connect(mongoUri);
  console.log(`MongoDB Connected: ${conn.connection.host}`);
};

const disconnectDB = async () => {
  await mongoose.disconnect();
  if (localMongoServer) {
    await localMongoServer.stop({ doCleanup: false });
  }
};

module.exports = { connectDB, disconnectDB };
