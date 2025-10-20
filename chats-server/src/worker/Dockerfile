# Use an official Node.js runtime as a base image
FROM node:20-bullseye

# Set the working directory inside the container
WORKDIR /app/chats-server/

# Copy package.json and package-lock.json to install dependencies
COPY package.json package-*.json ./

# Install dependencies
RUN npm install

COPY . .

CMD ["node", "src/worker/presence-worker.js"]