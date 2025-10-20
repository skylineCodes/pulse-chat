# Chat Application

This repository contains a chat application built with a microservices architecture. The application consists of several submodules, including a chat server, a chat client, a presence service, and performance testing configurations using Artillery.

The objective was to build a chat application capable of managing substantial concurrent user connections, supporting rapid message broadcasts, user presence status, and resilient WebSocket connections under a variety of network conditions.

The chat system aims to handle massive WebSocket connections, simulating up to 10,000 concurrent users.

Here is the link to the full case study of architecture decisions and design - https://www.onakoyakorede.cc/case-studies/pulse-chat

## Table of Contents
- [Features](#features)
- [Architecture](#architecture)
- [Submodules](#submodules)
- [Installation](#installation)
- [Usage](#usage)
- [Running Tests](#running-tests)
- [Contributing](#contributing)
- [License](#license)

## Features
- Real-time messaging between users
- User presence management (online/offline status)
- Scalable architecture using microservices
- Performance testing setup for load scenarios

## Architecture
The chat application is designed with the following components:
- **Chat Server**: Handles real-time chat communication.
- **Chat Client**: Provides the user interface for sending and receiving messages.
- **Presence Service**: Monitors and updates user online/offline status.
- **Artillery**: Configuration files for performance testing.

## Submodules
This repository includes the following submodules:
- **Chat-server**: Backend service managing chat functionalities.
- **Chat-client**: Frontend application for user interaction.
- **Presence-service**: Manages user presence and status updates.
- **Artillery**: Contains performance testing scripts and configurations.

## Installation
To set up the project, clone the repository with all submodules:

```bash
git clone --recurse-submodules <repository-url>
cd <repository-folder>
```

Replace <repository-url> with the URL of your repository and <repository-folder> with the name of the cloned folder.

## Prerequisites
Ensure you have the following installed:

Node.js (v14 or later)
Docker and Docker Compose (for running services)

## Usage
## Starting the Services
To start the server, navigate to the initial folder and run:
```
docker-compose up --build -d
```
This command builds the services defined in your docker-compose.yml file and runs them in detached mode.

## Running the Client
In a separate terminal, navigate to the chat-client folder and start the client by running:
```
cd chat-client
npm install
npm run dev
```
This command will start the client in development mode.

## Accessing the Chat Client
After starting the services, open your web browser and go to http://localhost:3000 (or the specified port for the chat client).

## Running Tests
To perform load testing with Artillery, navigate to the artillery folder and run:

```
artillery run ./artillery-tests/artillery-websocket.yml
```
The command assumes you have artillery installed on your computer globally.

## Contributing
Contributions are welcome! Please refer to the CONTRIBUTING.md for guidelines on how to contribute to this project.

## License
This project is licensed under the MIT License. See the LICENSE file for details.