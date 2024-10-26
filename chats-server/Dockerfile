# Use an official Node.js runtime as a base image
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /app/chats-server

# Install PM2 globally
RUN npm install -g pm2

# Copy package.json and package-lock.json to install dependencies
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application files
COPY . .

# Expose the necessary port
EXPOSE 4040

# Start the Node.js chat server
# CMD ["npm", "run", "start"]

RUN npm run build

# Start the app using PM2
CMD ["pm2-runtime", "start", "ecosystem.config.js"]