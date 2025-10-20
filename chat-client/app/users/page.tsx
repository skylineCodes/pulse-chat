'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import ReactPaginate from 'react-paginate';
import io from 'socket.io-client';
import UserCard from '@/components/UserCard';
import { useRouter, useSearchParams } from 'next/navigation';

// Socket.IO connection
const socket = io('http://localhost', {
  path: '/socket.io',
  transports: ['websocket'],
});

const UserList = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const username = searchParams.get('username');

  const [users, setUsers] = useState<any[]>([]);
  const [userStatuses, setUserStatuses] = useState<any>({});
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const handleCreateRoom = async (recipient: any) => {
    const data = await axios.post(`http://localhost:4001/create_room?username=${username}&recipient=${recipient}`);

    if (data.status === 200) {
        return router.push(
            `/chats?username=${username}&recipient=${recipient}&room_id=${data?.data?.room_id}`
        )
    }
  }

  console.log('users', users);

  const fetchUsers = async (page: any) => {
    try {
      const response = await axios.get(`http://localhost:4001/users`);
      const filterUser = response?.data?.users?.filter((item: any) => {
        return item?.first_name !== undefined && item?.username !== username
      });

      console.log(filterUser);

      setUsers(filterUser);

      setTotalPages(response.data.totalPages);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  useEffect(() => {
    fetchUsers(currentPage + 1); // Fetch users when the page loads

    // Listen for real-time status updates
    socket.on('user-status-update', (data) => {
      setUserStatuses((prevStatuses: any) => ({
        ...prevStatuses,
        [data.username]: data.isOnline,
      }));
    });

    // Clean up socket on component unmount
    return () => {
      socket.off('user-status-update');
    };
  }, [currentPage]);

  // Handle page change
  const handlePageChange = ({ selected }: any) => {
    setCurrentPage(selected);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl text-white mb-4">User List</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map((user) => (
          <UserCard
            key={user.username}
            user={user}
            onClick={() => handleCreateRoom(user?.username)}
            isOnline={userStatuses[user.username] || false}
          />
        ))}
      </div>

      {/* Pagination Component */}
      {/* <ReactPaginate
        previousLabel={'Previous'}
        nextLabel={'Next'}
        breakLabel={'...'}
        breakClassName={'break-me'}
        pageCount={totalPages}
        marginPagesDisplayed={2}
        pageRangeDisplayed={5}
        onPageChange={handlePageChange}
        containerClassName={'pagination'}
        // subContainerClassName={'pages pagination'}
        activeClassName={'active'}
      /> */}
    </div>
  );
};

export default UserList;
