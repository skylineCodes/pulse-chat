import React from 'react';

const UserCard = ({ user, onClick, isOnline }: any) => {
  return (
    <div className="flex items-center space-x-3 p-2 bg-gray-700 rounded-lg cursor-pointer" onClick={onClick}>
      <div className="relative">
        <img src={user.avatar} alt={user.username} className="h-10 w-10 rounded-full" />
        <span
          className={`absolute bottom-0 right-0 h-3 w-3 rounded-full ${
            isOnline ? 'bg-green-500' : 'bg-gray-500'
          }`}
        />
      </div>
      <div className="flex-1">
        <h3 className="text-white font-medium">{`${user.first_name} ${user.last_name}`}</h3>
        <p className="text-gray-400">@{user.username}</p>
      </div>
    </div>
  );
};

export default UserCard;
