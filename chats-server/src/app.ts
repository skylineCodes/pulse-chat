import path from 'path';
import express from 'express';
import { createServer } from 'http';
import Redis, { Cluster } from 'ioredis';
import { Server } from "socket.io";
import cors from 'cors';
import promClient from 'prom-client';
import { createAdapter } from "@socket.io/redis-adapter"; 
import { fetchUser } from './users';

const app = express();
app.use(cors());

// Create a new gauge metric for active WebSocket connections
const activeConnections = new promClient.Gauge({ name: 'active_connections', help: 'Number of active WebSocket connections' });

// Create a Redis Cluster
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

  const server = createServer(app);

  // Create a Socket.IO server
  const io = new Server(server, {
    pingTimeout: 60000,    // 60 seconds before disconnecting
    pingInterval: 25000,   // send ping every 25s
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
  io.on("connection", async (socket: any) => {
    activeConnections.inc();
    let username;

    // const username = String(socket.handshake.query.username || "");
    // console.log('User connected:', username);

    // 🚨 FIX 1: Robustly check the username from the handshake query.
    let usernameFromQuery = socket.handshake.query.username;

    console.log('username from handshake', usernameFromQuery);
    
    // Ensure the username is a non-empty string and not the literal string 'undefined'
    if (typeof usernameFromQuery === 'string' && usernameFromQuery.toLowerCase() === 'undefined') {
        usernameFromQuery = '';
    }

    console.log('User connected:', username); // This should now show a valid name or 'guest_user'

    // ensure alive flag
    socket.isAlive = true;
    
    // Publish 'user_presence' event
    redisCluster.publish('user_presence', JSON.stringify({ username, status: 'online', timestamp: new Date() }));

    // Join a chat room
    // socket.on('join room', async ({ username: payloadUsername, recipient, roomId }, callback) => {
    //   try {
    //     // ----------------------------------------------------
    //     // 1. IMMEDIATE ACKNOWLEDGMENT (Decoupling Point)
    //     // ----------------------------------------------------
    //     // IMPORTANT: Acknowledge the client immediately to prevent timeouts.
    //     // The client is told the message was received successfully.
    //     // We assume the DB write *will* succeed and handle errors asynchronously.
    //     callback({ status: 'ok', roomId });

    //     username = payloadUsername;

    //     const userNameToJoin = payloadUsername || username;

    //     console.log('payloadUsername', payloadUsername);

    //     socket.join(roomId);
    //     socket.join(`user:${userNameToJoin}`);

    //     // Fetch all room IDs from the Redis set associated with the user
    //     const userConversations = await subClient.smembers(`conversation:${userNameToJoin}`);

    //     // 1. Start Conversation Status Interval
    //     const convInterval = setInterval(() => {
    //       // This function now uses the stable 'socket.emit' 
    //       emitConversationStatuses(socket, userNameToJoin); 
    //     }, 10000); 

    //     // 2. Start User Status Interval
    //     const userStatusInterval = setInterval(() => {
    //       emitUserStatus(socket, userNameToJoin);
    //     }, 10000);
        
    //     // Store interval IDs on the socket object for cleanup later
    //     socket.convIntervalId = convInterval;
    //     socket.userStatusIntervalId = userStatusInterval;

    //     // Retrieve the message history for the room before appending
    //     // let messages: any = await redisCluster.lrange(`chat:${roomId}`, 0, -1);

    //     // fetch last 100 messages only
    //     const rawMessages = await redisCluster.lrange(`chat:${roomId}`, -100, -1);

    //     // Parse the message history (stored as JSON strings)
    //     const messages = rawMessages.map(m => JSON.parse(m));

    //     // Publish 'user_online' event
    //     redisCluster.publish('user_presence', JSON.stringify({
    //       username: userNameToJoin,
    //       status: 'online',
    //       timestamp: new Date(),
    //     }));

    //     // Emit the entire message history to all connected clients
    //     io.to(roomId).emit("chat message", { messages });
    //   } catch (error) {
    //     console.error('join room error', error);
    //     callback({ status: 'error', message: error.message });
    //   }
    // });

    // Listen for 'chat message' event from clients
    // socket.on("chat message", async (msg, callback) => {
    //   try {
    //     // ----------------------------------------------------
    //     // 1. IMMEDIATE ACKNOWLEDGMENT (Decoupling Point)
    //     // ----------------------------------------------------
    //     // IMPORTANT: Acknowledge the client immediately to prevent timeouts.
    //     // The client is told the message was received successfully.
    //     // We assume the DB write *will* succeed and handle errors asynchronously.
    //     callback({ status: 'ok' });

    //     username = msg.username;

    //     const user: any = (await fetchUser(msg.username)) || {
    //                         username: msg.username,
    //                         first_name: "Unknown",
    //                         last_name: "",
    //                         avatar: "/default-avatar.png",
    //                       };

    //     console.log('chat message user data', user);

    //     const messagePayload = {
    //       ...msg,
    //       ...user,
    //     }
        
    //     // Retrieve the message history for the room before appending
    //     let messages: any = await redisCluster.lrange(`chat:${msg?.roomId}`, 0, -1);
        
    //     // Parse the message history (stored as JSON strings)
    //     messages = messages.map(message => JSON.parse(message));
        
    //     // Add the newly received message to the message history
    //     messages.push(messagePayload);
        
    //     // push and cap
    //     await redisCluster.rpush(`chat:${msg.roomId}`, JSON.stringify(messagePayload));
    //     await redisCluster.ltrim(`chat:${msg.roomId}`, -200, -1);

    //     // Push the new message to Redis
    //     // await redisCluster.rpush(
    //     //   `chat:${msg?.roomId}`,
    //     //   JSON.stringify(messagePayload)
    //     // );

    //     // Publish 'user_presence' event
    //     redisCluster.publish('user_presence', JSON.stringify({
    //       username: user.username,
    //       status: 'online',
    //       timestamp: new Date(),
    //     }));

    //     // Publish the new message to the room's Redis channel
    //     await redisCluster.publish(msg?.roomId, JSON.stringify(messagePayload));

    //     io.to(msg?.roomId).emit("chat message", { messages });
    //     // io.to(msg.roomId).emit("chat message", { messages: [messagePayload] });

    //     // ----------------------------------------------------
    //     // C. BROADCAST & SUCCESS ACKNOWLEDGMENT
    //     // ----------------------------------------------------
    //     // Notify all other clients in the room/system
    //     // socket.broadcast.emit('chat message', { messages });

    //     // SUCCESS: Call the acknowledgment callback ONLY ONCE
    //     // callback({ status: 'ok', id: messages._id });
    //   } catch(error) {
    //     console.error('chat message error', error);

    //     callback({ 
    //       status: 'error', 
    //       message: 'Failed to send message due to a server error.' 
    //     });
    //   }
    // });

    // Join a chat room
    socket.on('join room', async ({ username: payloadUsername, recipient, roomId }, callback) => {
      try {
        // ----------------------------------------------------
        // 1. IMMEDIATE ACKNOWLEDGMENT (Non-Blocking)
        // ----------------------------------------------------
        if (typeof callback === 'function') {
          // Pass null for error, and the data/result for success
          callback({ status: 'ok', roomId });
        }

        const userNameToJoin = payloadUsername; // Use clear variable name
        username = userNameToJoin;

        // ----------------------------------------------------
        // 2. SOCKET ROOM MANAGEMENT
        // ----------------------------------------------------
        socket.join(roomId);
        socket.join(`user:${userNameToJoin}`);

        // ----------------------------------------------------
        // 3. CRITICAL: CLEAR & RE-ESTABLISH INTERVALS
        // This prevents the memory leak from creating duplicate timers.
        // ----------------------------------------------------
        if (socket.convIntervalId) {
          clearInterval(socket.convIntervalId);
          socket.convIntervalId = null;
        }
        if (socket.userStatusIntervalId) {
          clearInterval(socket.userStatusIntervalId);
          socket.userStatusIntervalId = null;
        }

        const convInterval = setInterval(() => {
          emitConversationStatuses(socket, userNameToJoin); 
        }, 10000); 

        const userStatusInterval = setInterval(() => {
          emitUserStatus(socket, userNameToJoin);
        }, 10000);
        
        socket.convIntervalId = convInterval;
        socket.userStatusIntervalId = userStatusInterval;

        // ----------------------------------------------------
        // 4. ASYNCHRONOUS HISTORY FETCH & PRESENCE UPDATE (Concurrent)
        // ----------------------------------------------------
        // Use Promise.all to fetch messages and publish presence concurrently.
        const [rawMessages] = await Promise.all([
            // Fetch last 100 messages only (Blocking Redis call)
            redisCluster.lrange(`chat:${roomId}`, -100, -1),
            
            // Publish 'user_online' event (Non-blocking)
            redisCluster.publish('user_presence', JSON.stringify({
              username: userNameToJoin,
              status: 'online',
              timestamp: Date.now(),
            }))
        ]);

        // Parse the message history (CPU overhead, but necessary for join)
        const messages = rawMessages.map(m => JSON.parse(m));

        // ----------------------------------------------------
        // 5. BROADCAST
        // ----------------------------------------------------
        // Emit the entire message history (up to 100)
        io.to(roomId).emit("chat message", { messages });
      } catch (error) {
        console.error('join room error', error);
        if (typeof callback === 'function') {
          // Pass null for error, and the data/result for success
          callback(null, { status: 'ok', roomId });
        }
      }
    });

    // Listen for 'chat message' event from clients
    socket.on("chat message", async (msg, callback) => {
      // ----------------------------------------------------
      // 1. IMMEDIATE ACKNOWLEDGMENT & BASIC VALIDATION (NON-BLOCKING)
      // ----------------------------------------------------
      // Acknowledge the client immediately to prevent timeouts and free up the socket.
      if (typeof callback === 'function') {
        // Pass null for error, and the data/result for success
        callback({ status: 'ok' });
      }

      if (!msg?.roomId || !msg?.username || !msg?.text) {
        console.error('Invalid message payload received.');
        return; // Stop processing invalid messages
      }

      try {
        // ----------------------------------------------------
        // 2. ASYNCHRONOUS DATA PREPARATION (Caching is recommended here)
        // ----------------------------------------------------
        const userData = (await fetchUser(msg.username)) || {
          username: msg.username,
          first_name: "Unknown",
          last_name: "",
          avatar: "/default-avatar.png",
        };

        const messagePayload = {
          ...msg,
          user_id: userData._id,
          first_name: userData.first_name,
          last_name: userData.last_name,
          avatar: userData.avatar,
          timestamp: Date.now(),
        };

        const messageJson = JSON.stringify(messagePayload);
        const chatKey = `chat:${msg.roomId}`;

        // Retrieve the message history for the room before appending
        // let messages: any = await redisCluster.lrange(`chat:${msg?.roomId}`, 0, -1);
        
        // // Parse the message history (stored as JSON strings)
        // messages = messages.map(message => JSON.parse(message));
        
        // // Add the newly received message to the message history
        // messages.push(messagePayload);
        
        // ----------------------------------------------------
        // 3. ATOMIC REDIS OPERATION (RPUSH + LTRIM)
        // ----------------------------------------------------
        // Use MULTI/EXEC for atomicity: push the new message, then trim the list.
        // We skip the inefficient LRANGE (reading the entire history).
        await redisCluster.multi()
            .rpush(chatKey, messageJson)
            .ltrim(chatKey, -200, -1) // Keep only the last 200 messages
            .exec();

        // ----------------------------------------------------
        // 4. PUBLISH & BROADCAST (Decoupled from primary flow)
        // ----------------------------------------------------
        // Publish to the room's Redis channel for scaling across processes
        await redisCluster.publish(msg.roomId, messageJson);

        // Publish user presence update
        redisCluster.publish('user_presence', JSON.stringify({
          username: userData.username,
          status: 'online',
          timestamp: messagePayload.timestamp,
        }));

        io.to(msg.roomId).emit("chat message", messagePayload);
      } catch(error) {
        console.error(`Error processing message for room ${msg?.roomId}:`, error);

        if (typeof callback === 'function') {
          // Pass null for error, and the data/result for success
          callback(null, { status: 'failed' });
        }
      }
    });

    // intervals (store ids)
    // const convInterval = setInterval(() => emitConversationStatuses(username, callback), 10000);
    // const userStatusInterval = setInterval(() => emitUserStatus(username, callback), 10000);

    // Function to emit updated user statuses
    // const emitConversationStatuses = async (socket, usernamePayload: string) => {
    //   try {
    //     console.log('chat_server', "I'm being called every 10 seconds", usernamePayload);

    //     const userConversations = await subClient.smembers(`conversation:${usernamePayload}`);

    //     const updatedConversations = await Promise.all(
    //       userConversations.map(async (conv) => {
    //         const parsedConv = JSON.parse(conv);

    //         try {
    //           const checkStatus = await redisCluster.hget('user_status', parsedConv?.username);
        
    //           return {
    //             ...parsedConv,
    //             online: await checkUserStatus(JSON.parse(checkStatus)?.lastSeen),
    //           };
    //         } catch (error) {
    //           console.error(`Failed to get status for user ${parsedConv?.username}:`, error);
    //           return {
    //             ...parsedConv,
    //             online: false, // Handle offline or error state
    //           };
    //         }
    //       })
    //     );

    //     // ✅ Filter out conversations with undefined first_name or last_name
    //     const filteredConversations = updatedConversations.filter(
    //       (conv) => conv.first_name !== undefined && conv.last_name !== undefined
    //     );

    //     io.to(`user:${usernamePayload}`).emit("conversations", { conversations: filteredConversations });
    //   } catch(error) {
    //     console.log({ 
    //       status: 'error', 
    //       message: 'Failed to emit conversationStatus due to a server error.' 
    //     });
    //   }
    // };

    // const emitUserStatus = async (socket, usernamePayload: string) => {
    //   try {
    //     const user: any = (await fetchUser(usernamePayload)) || {
    //                           username: usernamePayload,
    //                           first_name: "Unknown",
    //                           last_name: "",
    //                           avatar: "/default-avatar.png",
    //                         };

    //     console.log('user', user);
    //     console.log('username', usernamePayload);
    //     // console.log('chat_server', "I'm being called every 10 seconds, but for personal user", usernamePayload);

    //     const checkStatus = await redisCluster.hget('user_status', usernamePayload);

    //     io.to(`user:${usernamePayload}`).emit("user_details", {
    //       username: user?.username, 
    //       online: await checkUserStatus(JSON.parse(checkStatus)?.lastSeen), 
    //       lastSeen: JSON.parse(checkStatus)?.lastSeen, 
    //       first_name: user?.first_name, 
    //       last_name: user?.last_name, 
    //       avatar: user?.avatar, 
    //     });

    //     // Optionally, publish a background fetch request (explained next)
    //     await redisCluster.publish('user_profile_update', username);
    //   } catch(error) {
    //     console.error('chat message error', error);
    //   }
    // }

    // -------------------------------------------------------------------
    // IMPLEMENTATION OF PERIODIC EMITTING FUNCTIONS
    // -------------------------------------------------------------------

    // Function to emit updated user statuses
    const emitConversationStatuses = async (socket, username) => {
      try {
        console.log('chat_server', "I'm being called every 10 seconds", username);

        // 1. Fetch the user's conversation list keys
        // NOTE: This assumes 'conv' in the Set is a JSON string of the conversation object.
        const userConversations = await subClient.smembers(`conversation:${username}`);

        // Parse conversations and collect all unique recipient usernames
        const parsedConversations = userConversations.map(conv => JSON.parse(conv));
        const recipientUsernames = parsedConversations.map(conv => conv.username).filter(Boolean);

        // 2. OPTIMIZATION: Batch fetch ALL user statuses in a single Redis HMGET
        // This massively reduces network round trips compared to hget inside a loop.
        let checkStatuses = [];
        if (recipientUsernames.length > 0) {
          checkStatuses = await redisCluster.hmget('user_status', ...recipientUsernames);
        }

        const updatedConversations = await Promise.all(
          parsedConversations.map(async (conv) => {
            // Find the status check result that corresponds to the current conversation user
            const statusIndex = recipientUsernames.indexOf(conv.username);
            const rawStatus = checkStatuses[statusIndex];
            
            let onlineStatus = false;
            let lastSeen = null;

            try {
              const parsedStatus = JSON.parse(rawStatus);
              lastSeen = parsedStatus?.lastSeen;
              // The checkUserStatus function still needs to be awaited
              onlineStatus = await checkUserStatus(lastSeen);
            } catch (error) {
              // Error parsing status or status key didn't exist
              onlineStatus = false;
            }

            return {
              ...conv,
              online: onlineStatus,
            };
          })
        );

        // ✅ Filter out conversations with undefined first_name or last_name (Good Guardrail)
        const filteredConversations = updatedConversations.filter(
          (conv) => conv.first_name !== undefined && conv.last_name !== undefined
        );

        // Use io.to() to target the room for this specific user.
        io.to(`user:${username}`).emit("conversations", { conversations: filteredConversations });
      } catch(error) {
        console.error('Failed to emit conversationStatus:', error);
      }
    };

    const emitUserStatus = async (socket, username) => {
      try {
        const user: any = (await fetchUser(username)) || {
          username: username,
          first_name: "Unknown",
          last_name: "",
          avatar: "/default-avatar.png",
        };

        const checkStatus = await redisCluster.hget('user_status', username);
        const parsedStatus = JSON.parse(checkStatus || '{}');

        // 1. Emit the user's personal details and online status
        io.to(`user:${username}`).emit("user_details", {
          username: user?.username, 
          online: await checkUserStatus(parsedStatus?.lastSeen), 
          lastSeen: parsedStatus?.lastSeen, 
          first_name: user?.first_name, 
          last_name: user?.last_name, 
          avatar: user?.avatar, 
        });

        await redisCluster.publish('user_profile_update', username);
      } catch(error) {
        console.error('Error emitting user status:', error);
      }
    }

    // Handle heartbeat/ping from client
    socket.on('heartbeat', () => {
      socket.isAlive = true;

      console.log(`heartbeat received from ${username} at ${new Date()}`);

      redisCluster.publish('user_presence', JSON.stringify({
        username,
        status: 'online',
        timestamp: new Date(),
      }));
    });

    // helper cleanup
    const cleanup = () => {
      if (socket.__cleanedUp) {
        return;
      }
      socket.__cleanedUp = true;

      activeConnections.dec();
      clearInterval(checkHeartbeat);

      // CRITICAL: Stop the timers to prevent memory leaks!
      if (socket.convIntervalId) {
        clearInterval(socket.convIntervalId);
      }
      if (socket.userStatusIntervalId) {
        clearInterval(socket.userStatusIntervalId);
      }
      socket.removeAllListeners();
    };

    // Periodically check for missed heartbeats
    const checkHeartbeat = setInterval(() => {
      if (!socket.isAlive) {
        console.log(`checking for heartbeat for ${username} at ${new Date()}`);

        redisCluster.publish('user_presence', JSON.stringify({
          username,
          status: 'offline',
          timestamp: new Date(),
        }));

        clearInterval(checkHeartbeat);

        cleanup();
        socket.disconnect(true);
        return;
      }

      socket.isAlive = false; // Reset flag, waiting for next heartbeat
    }, 60000); // Check every 60 seconds

    socket.on('inactive', () => {
      redisCluster.publish('user_presence', JSON.stringify({
        username,
        status: 'offline',
        timestamp: new Date(),
      }));
    });

    socket.on('error', (err) => {
      console.error(`Socket error:`, err);
    });

    // Handle disconnect event
    socket.on('disconnect', (reason) => {
      console.log(`Socket disconnected: ${reason}`);
      console.log('User disconnected:', username);
      redisCluster.publish('user_presence', JSON.stringify({ username, status: 'offline', timestamp: new Date() }));
      cleanup();
    });
  });

  const port = process.env.SOCKET_PORT;

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

app.listen(process.env.PORT, () => {
  console.log(`Chat service running on port ${process.env.PORT}`);
});