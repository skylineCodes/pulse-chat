'use strict';

const fs = require('fs');
const csv = require('csv-parser');

let usernameData;

/**
 * Loads username data from a CSV file
 * @param {string} filePath - The path to the CSV file (e.g., './usernames.csv')
 * @returns {Promise<Array<{ username: string }>>} - An array of username objects
 */
const loadDataFromCsv = async (filePath) => {
  const results = [];

  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv({ separator: ',' })) // CSVs are comma-separated
      .on('data', (row) => {
        // Ensure the row has a username field
        if (row.username) {
          // results.push({ username: row.username.trim() });
          results.push(row.username.trim());
        }
      })
      .on('end', () => {
        console.log(`✅ Loaded ${results.length} usernames from ${filePath}`);
        resolve(results);
      })
      .on('error', (error) => {
        console.error(`❌ Error reading CSV file: ${error.message}`);
        reject(error);
      });
  });
};

// Example usage:
(async () => {
  usernameData = await loadDataFromCsv('./usernames.csv');
  console.log(usernameData.slice(0, 10)); // show first 10
})();

function setSocketQuery(context, events, done) {
  console.log(typeof usernameData);
  
  if (context.config && context.config.socketio) {
    // Inject username into socket.io handshake query
    context.config.socketio.query = usernameData;
  }

  console.log("👤 Connecting user:", usernameData);
  return done();
}


module.exports = {
  setSocketQuery,
  // Called before each virtual user (scenario) starts
  // beforeScenario: async (context, events, done) => {
  //   // Artillery automatically adds CSV fields into context.vars
  //   const { username } = context.vars;

  //   if (username) {
  //     // Promote it to query-level context
  //     context.vars.queryUsername = username;
  //   }

  //   return done();
  // },

  // setUsernameQuery: function (context, events, done) {
  //   console.log(context.vars.username);

  //   context.vars.username = usernameData

  //   // Set socket.io handshake query before connecting
  //   // context.engine.socketio.opts.query = {
  //   //   username: context.vars.username,
  //   // };

  //   // console.log(`👤 Connecting user: ${context.vars.username}`);
  //   return done();
  // },

  /**
   * Runs once after each virtual user finishes its scenario.
   * Useful for cleanup or custom metrics.
   */
  afterScenario: async (context, events, done) => {
    // Optionally track finished users
    events.emit('counter', 'users_finished');
    return done();
  },

  /**
   * Optional: Utility function to simulate message payload creation.
   * You can call this from YAML with `{{ $customMessage(username) }}` if needed.
   */
  customMessage: (username) => {
    return {
      username,
      message: `Hello from ${username} at ${new Date().toISOString()}`,
      timestamp: Date.now(),
    };
  },
};






// 'use strict';

// /**
//  * processors.js
//  * Used by Artillery to define custom logic for each virtual user
//  */

// module.exports = {
//   /**
//    * Called when a virtual user starts execution
//    * - Useful for setting up user-specific data (e.g., dynamic rooms or tokens)
//    */
//   beforeScenario: async function (context, events, done) {
//     const username = context.vars.username;

//     // Assign a random recipient different from self
//     const recipient = `user_${Math.floor(Math.random() * 1000) + 1}`;
//     const roomId = `room_${Math.floor(Math.random() * 100) + 1}`;

//     // Store them for this user's scenario
//     context.vars.recipient = recipient;
//     context.vars.roomId = roomId;

//     // Optional: track when the user started
//     context.vars.startTime = Date.now();

//     events.emit('counter', 'connecting');
//     setTimeout(() => {
//       done();
//     }, 1000); // Wait 1s before first emit

//     return done();
//   },

//   /**
//    * Called after a message or event is emitted (optional)
//    * - Can be used to record custom latency metrics
//    */
//   // afterResponse: function (requestParams, response, context, ee, next) {
//   //   if (response && response.timestamp) {
//   //     const latency = Date.now() - response.timestamp;
//   //     console.log(`Latency for ${context.vars.username}: ${latency}ms`);
//   //   }
//   //   return next();
//   // },

//   /**
//    * Example helper function: generate realistic chat messages
//    */
//   generateMessage: function (context, events, done) {
//     const messages = [
//       "Hey, how are you?",
//       "What's up?",
//       "Let's catch up later.",
//       "Did you check the update?",
//       "Good morning!",
//       "Let's meet in room {{ roomId }}.",
//     ];
//     const randomMessage =
//       messages[Math.floor(Math.random() * messages.length)];
//     context.vars.message = randomMessage;
//     return done();
//   },

//   /**
//    * Optional: run after scenario completes (for cleanup)
//    */
//   afterScenario: async function (context, events, done) {
//     const duration = Date.now() - context.vars.startTime;
//     console.log(`User ${context.vars.username} session lasted ${duration}ms`);
//     return done();
//   },
// };
