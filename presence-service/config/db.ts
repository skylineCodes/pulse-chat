import mongoose from 'mongoose';

const mongoUri = 'mongodb://mongo1:27017,mongo2:27017,mongo3:27017/presence_service?replicaSet=rs0&readPreference=secondaryPreferred';
// const mongoUri = 'mongodb://mongo1:27017/presence_service?maxPoolSize=100';

// Mongoose Example
const options = {
    // Increase this value significantly. A value of 100-200 is a good starting point for high traffic.
    maxPoolSize: 200, 
    minPoolSize: 5,   // Keep a few connections open even when idle
    socketTimeoutMS: 60000, // Optional: increase socket timeout
    family: 4, // IPv4

    // ----------------------------------------------------
    // *** FIX 2: Timeout for Replica Set Resilience ***
    // Set the timeout high enough to survive brief replica set elections.
    // If set too low (default is often 5000ms), the app throws a NoPrimary error
    // during a brief failover. 10 seconds is a resilient value.
    serverSelectionTimeoutMS: 10000, // 10 seconds
    
    // Other standard options (if needed)
    useNewUrlParser: true,
    useUnifiedTopology: true,
    // writeConcern: { w: 'majority', wtimeout: 5000 }, // Ensure durability but keep timeout reasonable
};

mongoose.connect(mongoUri, options)
.then(() => {
  console.log('Connected to MongoDB');
})
.catch((err) => {
  console.error('Failed to connect to MongoDB:', err);
});

// MongoDB connection events (optional)
mongoose.connection.on('connected', () => {
  console.log('Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('Mongoose disconnected');
});
