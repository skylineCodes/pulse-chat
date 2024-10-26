# Dockerfile
FROM node:alpine

WORKDIR /app/presence-service

COPY package*.json ./
RUN npm install

COPY . .

# HTTP API and WebSocket
EXPOSE 4001 5001

# Start the Node.js chat server
CMD ["npm", "run", "start"]
