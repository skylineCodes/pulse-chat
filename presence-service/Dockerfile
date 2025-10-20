# Dockerfile
FROM node:20-bullseye

WORKDIR /app/presence-service

# Copy package files first for caching
COPY package*.json ./

RUN npm install

# Install nodemon globally for hot reload
RUN npm install -g nodemon

COPY . .

# HTTP API and WebSocket
EXPOSE 4001 5001

# Start the Node.js chat server
CMD ["npm", "run", "start"]
