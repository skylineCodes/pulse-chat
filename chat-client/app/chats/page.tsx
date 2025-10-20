'use client'

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSocket } from "@/hooks/useSocket";
import axios from "axios";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FaRocketchat } from "react-icons/fa6";
import { format } from 'timeago.js';

export default function ChatUI() {
  const searchParams = useSearchParams();

  const roomId = searchParams.get('room_id');
  const recipient = searchParams.get('recipient');
  const username: any = searchParams.get('username');
  
  // console.log('username', username);

  const socket = useSocket(username, roomId, recipient);
  const [messages, setMessages] = useState<any[]>([]);
  const [userDetails, setUserDetails] = useState<any>({});
  const [conversations, setConversations] = useState<any[]>([]);

  const [timeAgo, setTimeAgo] = useState('');
  const [message, setMessage] = useState('');
  
  // Ref for the chat container to enable auto-scroll
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (socket) {
      socket.emit('join room', { username, recipient, roomId });

      // Listen for incoming conversations lists
      socket.on('conversations', (data) => {
        console.log('Every ten seconds...', data);
        if (data?.username !== username) {
          setConversations(data?.conversations);
        }
      });

      const fetchUserDetails = async () => {
        const response = await axios.get(`http://localhost:4001/user/${username}`);

        setUserDetails(response.data?.user)
      }

      fetchUserDetails();
      
      // Listen for incoming messages
      socket.on('chat message', (msg) => {
        console.log('chat message', msg);
        if (msg?.messages[0]?.roomId === roomId) {
          // Append incoming messages to state (not replace)
          setMessages((prev) => {
            if (msg?.messages) {
              // if server sent multiple messages (on join), spread them
              return [...prev, ...msg.messages];
            } else {
              // single message from another user
              return [...prev, msg];
            }
          });
          setMessages(msg?.messages);
        }
      });
      
      // Clean up the event listener when the component unmounts
      return () => {
        socket.off('chat message');
      };
    }
  }, [socket]);

  useEffect(() => {
    if (!userDetails?.online && userDetails?.lastSeen) {
      const calculateTimeAgo = () => {
        const lastSeenDate: any = new Date(userDetails.lastSeen);
        const now: any = new Date();
        const diffInMinutes = Math.floor((now - lastSeenDate) / 60000);
        
        setTimeAgo(`${diffInMinutes} mins ago`);
      };

      // Calculate once initially
      calculateTimeAgo();

      // Update every minute to keep it accurate
      const intervalId = setInterval(calculateTimeAgo, 60000);

      return () => clearInterval(intervalId);
    }
  }, [userDetails?.online, userDetails?.lastSeen]);

  // Auto-scroll to the bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);
  
  const handleSendMessage = () => {
    if (socket && message) {
      const messagePayload = {
        roomId,
        message,
        username,
        timestamp: new Date()
      }

      // 1️⃣ Immediately display message in sender's UI
      setMessages((prev) => [...prev, messagePayload]);
      
      // 2️⃣ Emit message to server
      socket.emit('chat message', messagePayload); // Emit the message to the server
      
      // 3️⃣ Reset input
      setMessage('');
    }
  };

  return (
    <div className="h-screen flex">
      {/* Left Sidebar */}
      <div className="w-[7vw] bg-gray-900 text-white flex flex-col items-center py-4">
        <div className="mb-8 text-lg font-bold">CH</div>
        <div className="space-y-4">
          <Button className="w-full bg-transparent"><FaRocketchat size={25} /></Button>
        </div>
      </div>

      {/* Chat List Pane */}
      <div className="w-[25vw] bg-gray-800 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-white text-xl font-semibold">Chat</h2>
          <Input placeholder="Search" className="w-1/2 bg-gray-700 text-white px-4 py-2 rounded-lg" />
        </div>

        {/* Conversations... */}
        <div className="mt-4 space-y-4">
          {/* List of Chats */}
          {conversations?.sort((a, b) => {
            // Sort so online users appear first
            if (a.online && !b.online) return -1;
            if (!a.online && b.online) return 1;
            return 0; // Preserve order if both are online/offline
          })?.map((item: any) => (
            <>
            {item.username !== username && (
              <div className="flex items-center space-x-3 p-2 bg-gray-700 rounded-lg">
                <div className="relative">
                  {/* Avatar with fallback */}
                  <Avatar className="h-10 w-10 flex items-center contain">
                    <AvatarImage src={item?.avatar} alt={item?.first_name} />
                    <AvatarFallback>{item?.first_name?.substring(0, 2)}</AvatarFallback>
                  </Avatar>
            
                  {/* Online/Offline status indicator */}
                  <span
                    className={`absolute bottom-0 right-0 block h-3 w-3 rounded-full ${
                      item?.online ? 'bg-green-500' : 'bg-gray-400'
                    } border-2 border-gray-700`}
                  ></span>
                </div>
            
                {/* User information */}
                <div className="flex-1">
                  <h3 className="text-white font-medium">{`${item?.first_name} ${item?.last_name}`}</h3>
                  <p className="text-gray-400">
                    {item?.last_message?.length > 20
                      ? `${item?.last_message.substring(0, 20)}...`
                      : item?.last_message}
                  </p>
                </div>
            
                {/* Last message timestamp */}
                <span className="text-xs text-gray-400">
                  {format(new Date(item?.last_message_time), 'p, MMM d, yyyy')}
                </span>
              </div>
            )}
            </>
          ))}
        </div>
      </div>

      {/* Active Chat Pane */}
      <div className="w-[70vw] bg-gray-700 p-4 flex flex-col">
        <div className="flex items-center justify-between">
         <div className="flex justify-start items-end gap-5">
          <div className="relative">
            {/* Avatar with fallback */}
            <Avatar className="h-10 w-10 flex items-center contain">
              <AvatarImage src={userDetails?.avatar} alt={userDetails?.first_name} />
              <AvatarFallback>{userDetails?.first_name?.substring(0, 2)}</AvatarFallback>
            </Avatar>
      
            {/* Online/Offline status indicator */}
            <span
              className={`absolute bottom-0 right-0 block h-3 w-3 rounded-full ${
                userDetails?.online ? 'bg-green-500' : 'bg-gray-400'
              } border-2 border-gray-700`}
            ></span>
          </div>
          <h2 className="text-white text-xl font-semibold">{`${userDetails?.first_name} ${userDetails?.last_name}`}</h2>
          <div className="text-gray-400 text-sm">{`${userDetails?.online === true ? 'online' : `was online ${timeAgo}`}`}</div>
         </div>
        </div>

        <div className="mt-4 flex-1 space-y-4 overflow-y-auto" ref={chatContainerRef}>
          {/* Chat Messages */}
          {messages.map((msg, index) => (
            <div 
              key={index} 
              className={`flex items-start space-x-3 ${msg.username === username ? 'justify-end' : 'justify-start'}`}
            >
              {/* Left-side user (not current user) */}
              {msg.username !== username && (
                <div className="flex flex-col items-start gap-3 relative">
                  <div className="relative bg-[#007AFF] p-2 rounded-lg max-w-xs">
                    <div className="absolute left-[-8px] top-4 w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-r-[8px] border-r-[#007AFF]"></div>                    
                    <p className="text-white mt-2">{msg?.message}</p>
                  </div>
                
                  {/* Avatar */}
                  <Avatar className="h-5 w-5 flex items-center contain">
                    <AvatarImage src={msg?.avatar} alt="You" />
                    <AvatarFallback>{msg?.first_name?.substring(0, 2)}</AvatarFallback>
                  </Avatar>
                
                  {/* Name */}
                  <div>
                    <p className="text-white text-xs">
                      {format(new Date(msg?.timestamp), 'p, MMM d, yyyy')}
                    </p>
                  </div>
                </div>              
              )}

              {/* Right-side user (current user) */}
              {msg.username === username && (
                <div className="flex flex-col items-end gap-3">
                  <div className="relative bg-[#25D366] p-2 rounded-lg max-w-xs">
                    <div className="absolute right-[-8px] top-4 w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-l-[8px] border-l-[#25D366]"></div>
                    <p className="text-white mt-2">{msg?.message}</p>
                  </div>
                  <Avatar className="h-5 w-5 flex items-center contain">
                    <AvatarImage src={msg?.avatar} alt="You" />
                    <AvatarFallback>{msg?.first_name?.substring(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div className="">
                    <p className="text-white text-xs">
                      {format(new Date(msg?.timestamp), 'p, MMM d, yyyy')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-auto flex items-center space-x-4">
          <Input 
            className="w-full bg-gray-600 text-white px-4 py-2 rounded-lg" 
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSendMessage();
              }
            }}
            placeholder="Your message" />
          <Button className="bg-blue-500 text-white px-4 py-2 rounded-lg" onClick={handleSendMessage}>Send</Button>
        </div>
      </div>
    </div>
  );
}
