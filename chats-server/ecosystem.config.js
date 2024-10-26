module.exports = {
    apps: [{
      name: "chat-api",
      script: "build/app.js",
      instances: "max", // Run in cluster mode with maximum CPU instances
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
      }
    }]
  };
  