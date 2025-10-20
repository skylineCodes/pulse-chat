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
};
