import { useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';

const SOCKET_URL = 'http://localhost';

export const useSocket = (username: string | null, roomId: string | null, recipient: string | null) => {
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

    if (username && roomId) {
      socketIO.emit('join room', { username, recipient, roomId });
    }

    socketIO.on('connect', () => {
      console.log('Connected to socket.io server...');
    })
    
    socketIO.on('connect_error', (error: any) => {
      console.log('Connection error...', error);
    });
    
    socketIO.on('disconnect', () => {
      console.log('Disconnected from Socket.io server...');
    })

    // Set the socket instance in the state
    setSocket(socketIO);

    // Clean up the connection when the component unmounts
    return () => {
      if (socketIO) {
        // socketIO.disconnect();
      }
    };
  }, [username, recipient, roomId]);

  return socket;
};
