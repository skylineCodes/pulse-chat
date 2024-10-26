import { Types } from "mongoose";
import { redisCluster } from "../app";
import { User } from "../schema/userSchema";

interface IUser {
  first_name: string,
  last_name: string,
  avatar: string,
  username: string,
}

export const insertManyUsers = async (documents: Omit<any, '_id'>[]): Promise<any[]> => {
  try {
    const createdDocuments = documents.map((doc) => ({
      ...doc,
      _id: new Types.ObjectId(),
    }));

    const result = await User.insertMany(createdDocuments);

    return result.map((doc) => doc as unknown as any);
  } catch (error) {
    throw error;      
  }
}

// Mark a user as online
export const markUserOnline = async (userPayload: IUser) => {
  const now = new Date();

  // Check if the user exists in MongoDB
  let user = await User.findOne({ username: userPayload?.username });

  if (user) {
    // Update the user's status if found
    await User.updateOne(
      { username: userPayload?.username },
      { 
        isOnline: true, 
        lastSeen: now, 
        // first_name: userPayload?.first_name, 
        // last_name: userPayload?.last_name, 
        // avatar: userPayload?.avatar 
      }
    );
  } else {
    // Create a new user record if it doesn't exist
    user = new User({
      username: userPayload?.username,
      first_name: userPayload?.first_name,
      last_name: userPayload?.last_name,
      avatar: userPayload?.avatar,
      isOnline: true,
      lastSeen: now
    });
    await user.save();
  }

  await redisCluster.hset('user_status', userPayload?.username, JSON.stringify({ username: userPayload?.username, online: true, lastSeen: Date.now() }));
  
  // Set the user's status in Redis with a TTL of 60 seconds
  // await redisCluster.set(`user_status:${userPayload?.username}`, "online", "EX", 60); 
};

// Mark a user as offline
export const markUserOffline = async (userPayload: IUser) => {
  const now = new Date();
  
  // Check if the user exists in MongoDB
  let user = await User.findOne({ username: userPayload?.username });
  
  if (user) {
    // Update the user's status if found
    await User.updateOne(
      { username: userPayload?.username },
      { 
        isOnline: false, 
        lastSeen: now, 
        // first_name: userPayload?.first_name, 
        // last_name: userPayload?.last_name, 
        // avatar: userPayload?.avatar 
      }
    );
  } else {
    // Create a new user record if it doesn't exist
    user = new User({
      username: userPayload?.username,
      first_name: userPayload?.first_name,
      last_name: userPayload?.last_name,
      avatar: userPayload?.avatar,
      isOnline: false,
      lastSeen: now
    });
    await user.save();
  }
  
  await redisCluster.hset('user_status', userPayload?.username, JSON.stringify({ username: userPayload?.username, online: false, lastSeen: Date.now() }));

  // Set the user's status in Redis with a TTL of 5 minutes (300 seconds)
  // await redisCluster.set(`user_status:${userPayload?.username}`, "offline", "EX", 300); 
};

// Check user status
export const getUserStatus = async (username: string | any) => {
  const user = await User.findOne({ username });
  // const userDelete = await User.findOneAndDelete({ username });

  // Check if the user is in Redis
  const status = await redisCluster.hget(`user_status`, username);

  console.log(status);

  if (status === "online") {
    // Return if the user is found to be online in Redis
    return { username, online: true, first_name: user?.first_name, last_name: user?.last_name, avatar: user?.avatar, lastSeen: user ? user.lastSeen : null  };
  } else {
    // Return user's offline status and lastSeen from MongoDB if available
    return { 
      username: user?.username,
      online: user?.isOnline,
      first_name: user?.first_name, 
      last_name: user?.last_name, 
      avatar: user?.avatar,
      lastSeen: user ? user.lastSeen : null // Return lastSeen if user exists, otherwise null
    };
  }
};

export const fetchUser = async (username: any) => {
  const user = await User.findOne({ username });

  return user;
}

export const fetchAllUsers = async () => {
  const users = await User.find();

  return users;
}