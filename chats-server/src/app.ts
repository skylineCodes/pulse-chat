import path from 'path';
import express from 'express';
import { createServer } from 'http';
import Redis, { Cluster } from 'ioredis';
import { Server } from "socket.io";
import cors from 'cors';
import promClient from 'prom-client';
import { createAdapter } from "@socket.io/redis-adapter"; 
import { findUsername, users } from './users';

const app = express();
app.use(cors());

// Create a new gauge metric for active WebSocket connections
const activeConnections = new promClient.Gauge({ name: 'active_connections', help: 'Number of active WebSocket connections' });

const startServer = async () => {

  app.get('/socket.io/socket.io.js', (req, res) => {
    res.sendFile(
      path.resolve(
        __dirname,
        'node_modules',
        'socket.io',
        'client-dist',
        'socket.io.js'
      )
    )
  });

  // Create a Redis Cluster
  const redisCluster = new Cluster(
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
      redisOptions: {
        tls: undefined,
      },
    }
  );

  redisCluster.on("ready", () => {
    console.log("Redis Client Ready");
  });
  
  // Connection test
  redisCluster.on('connect', () => {
    console.log('Connected to Redis cluster');
  });

  redisCluster.on('error', (err) => {
    console.error('Redis Cluster failed to connect:', err);
  });

  const subClient = redisCluster.duplicate([], {
    lazyConnect: true,
    dnsLookup: (address, callback) => callback(null, address),
    redisOptions: {
      tls: undefined,
    },
  });

  subClient.on("ready", () => {
    console.log("Sub Redis Client Ready");
  });

  // Connection test
  subClient.on('connect', () => {
    console.log('Sub client connected to Redis cluster');
  });

  subClient.on('error', (err) => {
    console.error('Sub client failed to connect:', err);
  });

  const server = createServer(app);

  // Create a Socket.IO server
  const io = new Server(server, {
    connectionStateRecovery: {},
    adapter: createAdapter(redisCluster, subClient), // Using ioredis clients for pub/sub
    cors: {
      origin: "*",  // Allow all origins (for development)
      methods: ["GET", "POST"]
    },
  });

  const checkUserStatus = async (lastSeen: any) => {
    const currentTime: any = new Date();
    const lastSeenTime: any = new Date(lastSeen);
  
    // Calculate the difference in minutes
    const differenceInMinutes = (currentTime - lastSeenTime) / (1000 * 60);

    // Calculate the difference in seconds
    // const differenceInSeconds = (currentTime - lastSeenTime) / 1000;
  
    // Check if the difference is greater than 3 minutes
    return differenceInMinutes > 3 ? false : true;
  }

  // Listen for connections
  io.on("connection", (socket: any) => {
    activeConnections.inc();

    const username = socket.handshake.query.username;
    const user: any = findUsername(username);

    console.log("User connected:", username);

    // Publish 'user_online' event
    redisCluster.publish('user_presence', JSON.stringify({
      username,
      first_name: user?.first_name,
      last_name: user?.last_name,
      avatar: user?.avatar,
      status: 'online',
      timestamp: new Date(),
    }));

    socket.on('user_status', ({ data }) => {
      const { username, online, lastSeen, first_name, last_name, avatar } = data;

      console.log(username)
      console.log()
      console.log(username)

      io.to(`user:${username}`).emit("user_details", { username, online, lastSeen, first_name, last_name, avatar });
    });

    // Join a chat room
    socket.on('join room', async ({ username, recipient, roomId }) => {
      const user: any = findUsername(username);

      socket.join(roomId);
      socket.join(`user:${user?.username}`);

      // Fetch all room IDs from the Redis set associated with the user
      const userConversations = await subClient.smembers(`conversation:${user?.username}`);

      // Retrieve the message history for the room before appending
      let messages: any = await redisCluster.lrange(`chat:${roomId}`, 0, -1);

      // Publish 'user_online' event
      redisCluster.publish('user_presence', JSON.stringify({
        username,
        first_name: user?.first_name,
        last_name: user?.last_name,
        avatar: user?.avatar,
        status: 'online',
        timestamp: new Date(),
      }));
      
      // Parse the message history (stored as JSON strings)
      messages = messages.map(message => JSON.parse(message));

      // Emit the entire message history to all connected clients
      io.to(roomId).emit("chat message", { messages });
    });

    // Listen for 'chat message' event from clients
    socket.on("chat message", async (msg) => {
      const user: any = findUsername(msg?.username);
      
      const messagePayload = {
        ...msg,
        first_name: user?.first_name,
        last_name: user?.last_name,
        avatar: user?.avatar
      }
      
      // Retrieve the message history for the room before appending
      let messages: any = await redisCluster.lrange(`chat:${msg?.roomId}`, 0, -1);
      
      // Parse the message history (stored as JSON strings)
      messages = messages.map(message => JSON.parse(message));
      
      // Add the newly received message to the message history
      messages.push(messagePayload);

      // Push the new message to Redis
      await redisCluster.rpush(
        `chat:${msg?.roomId}`,
        JSON.stringify(messagePayload)
      );

      // Publish 'user_presence' event
      redisCluster.publish('user_presence', JSON.stringify({
        username,
        first_name: user?.first_name,
        last_name: user?.last_name,
        avatar: user?.avatar,
        status: 'online',
        timestamp: new Date(),
      }));

      // Publish the new message to the room's Redis channel
      await redisCluster.publish(msg?.roomId, JSON.stringify(messagePayload));

      io.to(msg?.roomId).emit("chat message", { messages });
    });

    // Function to emit updated user statuses
    const emitUserStatuses = async () => {
      console.log("I'm being called every 10 seconds", username);

      const userConversations = await subClient.smembers(`conversation:${username}`);

        const updatedConversations = await Promise.all(
          userConversations.map(async (conv) => {
            const parsedConv = JSON.parse(conv);

            console.log(parsedConv);

            try {
              const checkStatus = await redisCluster.hget('user_status', parsedConv?.username);

              console.log(JSON.parse(checkStatus));
              console.log(parsedConv?.username, await checkUserStatus(JSON.parse(checkStatus)?.lastSeen));
        
              return {
                ...parsedConv,
                online: await checkUserStatus(JSON.parse(checkStatus)?.lastSeen),
              };
            } catch (error) {
              console.error(`Failed to get status for user ${parsedConv?.username}:`, error);
              return {
                ...parsedConv,
                online: false, // Handle offline or error state
              };
            }
          })
        );

        io.to(`user:${username}`).emit("conversations", { conversations: updatedConversations });
    };

    setInterval(emitUserStatuses, 10000);

    socket.on("disconnect", () => {
      activeConnections.dec();
      
      console.log("User disconnected:", username);

      // Publish 'user_offline' event with a delay (grace period)
      setTimeout(() => {
        redisCluster.publish('user_presence', JSON.stringify({
          username,
          first_name: user?.first_name,
          last_name: user?.last_name,
          avatar: user?.avatar,
          status: 'offline',
          timestamp: new Date(),
        }));
      }, 10000);  // Grace period (10 seconds)
    });

    // Emit a heartbeat every 10 seconds to keep the connection alive
    setInterval(() => {
      socket.to(`user:${username}`).emit('ping', { timestamp: Date.now() });
    }, 10000); // 10 seconds interval
  });

  const port = process.env.PORT;

  console.log(port);

  // Start the Socket.IO server
  server.listen(port, () => {
    console.log(`Socket.IO server is listening on port ${port}`);
  });
};

// Start the server
startServer().catch((err) => {
  console.error("Error starting the server:", err);
});


// Set up a route to expose the metrics
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(await promClient.register.metrics());
});

app.listen(4041, () => {
  console.log(`Chat service running on port ${4041}`);
});