const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('❌ [MongoDB Error]: MONGODB_URI environment variable is missing.');
    return;
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000, // 10 seconds to select server
      socketTimeoutMS: 45000,          // 45 seconds before socket timeout
      maxPoolSize: 10,                 // Connection pool limit
    });
    console.log(`✅ [MongoDB Connected] Host: ${conn.connection.host}, DB: ${conn.connection.name}`);
  } catch (error) {
    console.error(`❌ [MongoDB Connection Error]: ${error.message}`);
    // Do not crash immediately so health checks remain responsive, but log clearly
  }
};

// Monitor connection events
mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  [MongoDB Warning]: Connection disconnected. Attempting reconnect...');
});

mongoose.connection.on('error', (err) => {
  console.error(`❌ [MongoDB Error]: ${err.message}`);
});

module.exports = connectDB;
