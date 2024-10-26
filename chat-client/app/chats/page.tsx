'use client'

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSocket } from "@/hooks/useSocket";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FaRocketchat } from "react-icons/fa6";
import { format } from 'timeago.js';

export default function ChatUI() {
  const searchParams = useSearchParams();

  const roomId = searchParams.get('room_id');
  const username = searchParams.get('username');
  const recipient = searchParams.get('recipient');

  const socket = useSocket(username, roomId, recipient);
  const [messages, setMessages] = useState<any[]>([]);
  const [userDetails, setUserDetails] = useState<any>({});
  const [conversations, setConversations] = useState<any[]>([]);
  const [message, setMessage] = useState('');

  // console.log(userDetails)
  
  // Ref for the chat container to enable auto-scroll
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (socket) {
      // Listen for incoming conversations lists
      socket.on('conversations', (data) => {
        console.log('Every ten seconds...');
        if (data?.username !== username) {
          setConversations(data?.conversations);
        }
      });
      
      // Listen for incoming user details
      socket.on('user_details', (msg) => {
        if (msg?.username === username) {
          console.log(msg)
          setUserDetails(msg);
        }
      });
      
      // Listen for incoming messages
      socket.on('chat message', (msg) => {
        setMessages(msg?.messages);
      });

      // Handle ping (heartbeat) from the server
      socket.on('ping', (data) => {
        console.log('Heartbeat from server at ' + new Date(data.timestamp).toLocaleTimeString());
      });
      
      // Clean up the event listener when the component unmounts
      return () => {
        socket.off('chat message');
      };
    }
  }, [socket]);

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
      
      socket.emit('chat message', messagePayload); // Emit the message to the server
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

        <div className="mt-4 space-y-4">
          {/* List of Chats */}
          {conversations?.map((item: any) => (
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
          <div className="text-gray-400 text-sm">{`${userDetails?.online === true ? 'online' : 'offline'}`}</div>
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
                  <div className="relative bg-[#007AFF] p-4 rounded-lg max-w-xs">
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
                  <div className="relative bg-[#25D366] p-4 rounded-lg max-w-xs">
                    <div className="absolute right-[-8px] top-4 w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-l-[8px] border-l-[#25D366]"></div>
                    <p className="text-white mt-2">{msg?.message}</p>
                  </div>
                  <Avatar className="h-5 w-5 flex items-center contain">
                    <AvatarImage src={msg?.avatar} alt="You" />
                    <AvatarFallback>{msg?.first_name?.substring(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div className="">
                    {/* <h4 className="text-white font-semibold text-xs">
                      {`${msg?.first_name} ${msg?.last_name}`}
                    </h4> */}
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

      {/* Chat Details Pane */}
      {/* <div className="w-[20vw] bg-gray-900 p-4">
        <h2 className="text-white text-lg font-semibold">Chat Details</h2>

        <div className="mt-4">
          <h3 className="text-gray-400 text-sm">Photos and Videos</h3>
          <div className="space-y-2 mt-2">
            <img src="/images/pizza.jpg" alt="Pizza" className="rounded-lg w-full h-auto" />
            <img src="/images/video-thumbnail.jpg" alt="Video" className="rounded-lg w-full h-auto" />
          </div>
        </div>

        <div className="mt-4">
          <h3 className="text-gray-400 text-sm">Shared Files</h3>
          <div className="space-y-2 mt-2">
            <div className="text-gray-400 text-sm">Contract for printing services</div>
            <div className="text-gray-400 text-sm">Changes in department schedule</div>
          </div>
        </div>

        <div className="mt-4">
          <h3 className="text-gray-400 text-sm">Shared Links</h3>
          <div className="space-y-2 mt-2">
            <a href="#" className="text-blue-400">Economic Policy</a>
            <a href="#" className="text-blue-400">Microsoft</a>
            <a href="#" className="text-blue-400">Government Portal</a>
          </div>
        </div>
      </div> */}
    </div>
  );
}
