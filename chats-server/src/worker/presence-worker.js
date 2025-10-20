import axios from "axios";
import Redis, { Cluster } from 'ioredis';

const PRESENCE_SERVICE_URL = process.env.PRESENCE_SERVICE_URL || "http://presence-service:4001";

export const redisCluster = new Cluster(
  [
    { host: 'redis-1', port: 6379 },
    { host: 'redis-2', port: 6379 },
    { host: 'redis-3', port: 6379 },
    { host: 'redis-4', port: 6379 },
    { host: 'redis-5', port: 6379 },
    { host: 'redis-6', port: 6379 },
  ],
  {
    lazyConnect: true,
    dnsLookup: (address, callback) => callback(null, address),
    natMap: {
      "redis-1:6379": { host: "redis-1", port: 6379 },
      "redis-2:6379": { host: "redis-2", port: 6379 },
      "redis-3:6379": { host: "redis-3", port: 6379 },
      "redis-4:6379": { host: "redis-4", port: 6379 },
      "redis-5:6379": { host: "redis-5", port: 6379 },
      "redis-6:6379": { host: "redis-6", port: 6379 },
    },
    redisOptions: {
      tls: undefined,
      connectTimeout: 10000,
    },
  }
);

redisCluster.on("ready", () => {
  console.log('chat_server', "Redis Client Readyyyy");
});

// Connection test
redisCluster.on('connect', () => {
  console.log('chat_server', 'Connected to Redis clusterrrr');
});

redisCluster.on('error', (err) => {
  console.error('Redis Cluster failed to connect:', err);
});

export const subClient = redisCluster.duplicate([], {
  lazyConnect: true,
  dnsLookup: (address, callback) => callback(null, address),
  redisOptions: {
    tls: undefined,
  },
});

subClient.on("ready", () => {
  console.log('chat_server', "Sub Redis Client Readyyy");
});

// Connection test
subClient.on('connect', () => {
  console.log('chat_server', 'Sub client connected to Redis clusterrrr');
});

subClient.on('error', (err) => {
  console.error('Sub client failed to connect:', err);
});

subClient.subscribe("user_profile_update", (err) => {
  if (err) console.error("Failed to subscribe:", err);
  else console.log("Worker subscribed to user_profile_update channel");
});

subClient.on("message", async (channel, username) => {
  if (channel === "user_profile_update") {
    console.log(`Worker fetching profile for ${username}`);

    try {
      const res = await axios.get(`PRESENCE_SERVICE_URL/user/${username}`);
      const user = res.data?.user;
      if (user) {
        await redisCluster.set(`user_profile:${username}`, JSON.stringify(user), "EX", 3600);
        console.log(`✅ User profile updated for ${username}`);
      }
    } catch (err) {
      console.error(`❌ Error updating ${username}:`, err.message);
    }
  }
});
