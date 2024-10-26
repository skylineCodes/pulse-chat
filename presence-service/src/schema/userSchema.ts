import mongoose from "mongoose";

// MongoDB user status schema
const userSchema = new mongoose.Schema({
  username: String,
  first_name: String,
  avatar: String,
  last_name: String,
  lastSeen: Date,
  isOnline: Boolean,
});
  
export const User = mongoose.model("User", userSchema);