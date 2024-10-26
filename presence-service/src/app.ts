import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import cors from 'cors';
import express from 'express';
import '../config/db';
import { Cluster } from "ioredis";
import { Server } from 'socket.io';
import { createServer } from 'http';
import { io as socketIoClient } from 'socket.io-client';
import { createAdapter } from "@socket.io/redis-adapter"; 
import { fetchAllUsers, fetchUser, getUserStatus, insertManyUsers, markUserOffline, markUserOnline } from './controller/PresenceController';

const app = express();
app.use(express.json());
app.use(cors());

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
    redisOptions: {
      tls: undefined,
    },
  }
);

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

subClient.subscribe('user_presence', (err, count) => {
  if (err) {
    console.error('Failed to subscribe:', err);
  } else {
    console.log(`Subscribed to user_presence channels. ${count}`);
  }
});

subClient.on('message', (channel, message) => {
  const event = JSON.parse(message);

  if (channel === 'user_presence') {
    if (event.status === 'online') {
      markUserOnline(event);
      userOnline(event?.username);
    } else if (event.status === 'offline') {
      // Mark user as offline
      markUserOffline(event);
      userOnline(event?.username);
    }
  }
});

const server = createServer(app);

// Initialize the Socket.IO server
const io = new Server(server);

// Connect to the Chat server
// const ioChatServer = socketIoClient('http://localhost'); // Chat server URL

// Create the Socket.IO connection
const ioChatServer = socketIoClient('http://nginx', {
  path: '/socket.io',
  transports: ['websocket'],
});

ioChatServer.on('connect', () => {
  console.log('Connected to Chat server');
});

// Emit an event when a user goes online
const userOnline = async (username: string) => {
  const statusData = await getUserStatus(username);

  ioChatServer.emit('user_status', { data: statusData });
};

// Use the Redis adapter
io.adapter(createAdapter(redisCluster, subClient));

io.on("connection", async (socket) => {
  const username = socket.handshake.query.username;

  socket.on("disconnect", () => {
    console.log('Disconnected...');
  });
});

// Initialize WebSocket on port 5001 (separate from HTTP API)
server.listen(5001, () => {
  console.log("Presence WebSocket server listening on port 5001");
});

// API endpoint to fetch user status
app.get("/status/:username", async (req, res) => {
  const username = req.params.username;
  const status = await getUserStatus(username);

  res.status(200).json({
    data: status
  });
});

// API endpoint to fetch all users
app.get("/users", async (req, res) => {
  const users = await fetchAllUsers();

  res.status(200).json({
    users
  });
});

app.post("/create_users", async (req, res) => {
  const { users } = req?.body;

  const result = await insertManyUsers(users);

  res.status(201).json({
    message: 'Users created successfully!',
    data: result,
  })
})

// API endpoint to create a room
app.post("/create_room", async (req, res) => {
  const { username, recipient } = req?.query;

  // Fetch data for both the recipient and username
  const userDataRecipient: any = await fetchUser(recipient);
  const userDataUsername: any = await fetchUser(username); // corrected

  // Create a room ID for the new conversation
  const roomId = uuidv4();

  // Data for the new room for both participants
  const joinRoomDataForUsername = {
    room_id: roomId,
    username: userDataRecipient?.username,
    owner: userDataUsername?.username,
    first_name: userDataRecipient?.first_name,
    last_name: userDataRecipient?.last_name,
    avatar: userDataRecipient?.avatar,
  };

  const joinRoomDataForRecipient = {
    room_id: roomId,
    username: userDataUsername?.username,
    owner: userDataRecipient?.username,
    first_name: userDataUsername?.first_name,
    last_name: userDataUsername?.last_name,
    avatar: userDataUsername?.avatar,
  };

  // await subClient.del(`conversation:${username}`);
  // await subClient.del(`conversation:${recipient}`);
  // console.log(roomId);

  // Fetch all room conversations for the current user
  const userConversations = await subClient.smembers(`conversation:${username}`);

  // Check if a conversation already exists with the recipient
  const existingConversation = userConversations.find((conv) => {
    const parsedConv = JSON.parse(conv);
    return parsedConv?.username === recipient;
  });

  // console.log(existingConversation);

  // If a conversation exists, return the existing room ID
  if (existingConversation) {
    const parsedConv = JSON.parse(existingConversation);
    return res.status(200).json({
      message: 'Room fetched successfully!',
      room_id: parsedConv?.room_id,
    });
  }

  // If no conversation exists, add the new room to the conversation lists
  await subClient.sadd(`conversation:${username}`, JSON.stringify(joinRoomDataForUsername));
  await subClient.sadd(`conversation:${recipient}`, JSON.stringify(joinRoomDataForRecipient));

  // Return the new room ID
  res.status(200).json({
    message: 'Room created successfully!',
    room_id: roomId,
  });
});

// Initialize server
const PORT = process.env.PORT || 4001;
app.listen(PORT, () => {
  console.log(`Presence service running on port ${PORT}`);
});
