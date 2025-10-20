import { useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';

const SOCKET_URL = 'http://localhost';

let isUserActive = true;
const HEARTBEAT_INTERVAL = 30 * 1000; // 30 seconds
const RETRY_DELAY = 10 * 1000;        // Delay between retries
const MAX_RETRIES = 3;                // Maximum retry attempts
// const INACTIVITY_LIMIT = 5 * 60 * 1000; // 5 minutes in milliseconds
const INACTIVITY_LIMIT = 10 * 1000; // 10 in milliseconds
let inactivityTimer: string | number | NodeJS.Timeout | undefined;

let retryCount = 0;

export const useSocket = (username: string, roomId: string | null, recipient: string | null) => {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    // Create the Socket.IO connection
    const socketIO = io(SOCKET_URL, {
      path: '/socket.io',
      transports: ['websocket'],
      query: {
        username
      }
    });
    
    // Set the socket instance in the state
    setSocket(socketIO);

    if (username && roomId) {
      console.log('join room event emitted...');
      socketIO.emit('join room', { username, recipient, roomId });
    }

    // Function to reset the inactivity timer
    const resetInactivityTimer = () => {
      isUserActive = true;
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        isUserActive = false;
        socketIO.emit('userInactive'); // Notify server of inactivity
      }, INACTIVITY_LIMIT);
    }

    socketIO.on('connect', () => {
      console.log('Connected to socket.io server...');
      resetInactivityTimer(); // Reset on reconnect
    });

    socketIO.on('userInactive', () => {
      isUserActive = false;
      socketIO.emit('inactive'); // Send inactive
      // socketIO.emit('userStatusUpdate', { status: 'offline' });
    });
    
    socketIO.on('connect_error', (error: any) => {
      console.log('Connection error...', error);
    });

    const sendHeartbeat = () => {
      console.log(`Attempting heartbeat for ${username} at ${new Date()}...`);

      socketIO.emit('heartbeat', (response: any) => {
        if (response && response.success) {
          // Heartbeat successful, reset retry counter
          console.log(`Heartbeat successful for ${username}`);
          retryCount = 0;
        } else {
          // Heartbeat failed, initiate retry
          handleRetry();
        }
      });
    }

    const handleRetry = () => {
      if (retryCount < MAX_RETRIES) {
        retryCount++;
        console.log(`Retry attempt ${retryCount} for ${username}...`);
        setTimeout(() => {
          sendHeartbeat();
        }, RETRY_DELAY);
      } else {
        console.log(`Max retries reached. Reconnection triggered for ${username}.`);
        retryCount = 0;
        socketIO.on('connect', () => {
          console.log('Connected to socket.io server...');
          resetInactivityTimer(); // Reset on reconnect
        });
      }
    }

    setInterval(() => {
      if (isUserActive) {
        sendHeartbeat();
        // console.log(`heartbeat emitted for ${username} at ${new Date()}...`);
        // socketIO.emit('heartbeat'); // Only send heartbeat if active
      }
    }, HEARTBEAT_INTERVAL);

    // Reset the timer on any user activity
    // document.addEventListener('mousemove', resetInactivityTimer);
    document.addEventListener('keypress', resetInactivityTimer);
    
    socketIO.on('disconnect', () => {
      console.log("Disconnected from server. Attempting to reconnect...");
      socketIO.connect();
    });

    // Clean up the connection when the component unmounts
    return () => {
      if (socketIO) {
        // socketIO.disconnect();
      }
    };
  }, [username, recipient, roomId]);

  return socket;
};
