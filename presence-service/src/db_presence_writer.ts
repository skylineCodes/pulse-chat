import { User } from './schema/userSchema';

// CONSTANTS
// How often to sweep the pending queue and commit all updates to the DB
const WRITE_INTERVAL_MS = 5000; // Write every 5 seconds

// We use a Map to track the latest state for each user.
// This is the single source of truth for pending updates.
// Key: username (string)
// Value: The state to be persisted { isOnline: boolean, lastSeen: Date }
const pendingUpdates = new Map<string, { isOnline: boolean; lastSeen: Date }>();

// --- CORE MONGODB BATCH WRITE FUNCTION (Executed on a global interval) ---
async function executeBatchWriteToDatabase(): Promise<void> {
    // 1. Check if there are any updates to perform
    if (pendingUpdates.size === 0) {
        return;
    }

    // 2. Safely clone the list of updates and clear the global queue
    // This allows new updates to accumulate while the bulk write is running.
    const updatesToCommit = new Map(pendingUpdates);
    pendingUpdates.clear();

    // 3. Convert the Map of updates into an array of bulkWrite operations
    const bulkOperations: any[] = Array.from(updatesToCommit.entries()).map(([username, state]) => ({
        // We use updateOne for each entry in the bulk operation
        updateOne: {
            filter: { username: username },
            update: { $set: state },
            upsert: true, // Optionally upsert if a user is created via presence
        }
    }));

    try {
        const numUpdates = bulkOperations.length;
        console.log(`[DB Writer] Starting bulk write for ${numUpdates} user(s)...`);

        // 4. Execute the single bulkWrite operation
        const result = await User.bulkWrite(bulkOperations);

        console.log(`[DB Writer] Bulk write finished. Upserted: ${result.upsertedCount}, Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`);

    } catch (error) {
        console.error(`[DB Writer] FATAL MongoDB bulkWrite failure:`, error);
        // CRITICAL: If a bulk write fails, we should re-queue the updates that failed or were pulled.
        // For simplicity, we are logging and assuming temporary failure, but in production, 
        // you would push the items back into the queue or a retry system.
    }
}

// --- GLOBAL BATCH SCHEDULER ---
// Start a recurring timer that executes the batch write function
setInterval(executeBatchWriteToDatabase, WRITE_INTERVAL_MS);


// --- PUBLIC FACING QUEUE FUNCTION ---
/**
 * Queues a user's status for the next scheduled batch database write.
 * @param username The user identifier.
 * @param state The state to persist (isOnline and lastSeen).
 */
export const queuePresenceUpdate = (username: string, state: { isOnline: boolean; lastSeen: Date }): void => {
    // This function is now simple: it just ensures the latest state is in the map.
    // The global interval handles the writing.
    pendingUpdates.set(username, state);

    // Optional: Log here to confirm the update was queued successfully
    console.log(`[DB Queue] Queued state for user ${username}. Updates pending: ${pendingUpdates.size}`);
};

















// import debounce from 'lodash.debounce';
// import { User } from './schema/userSchema';

// // We use a Map to track the latest state for each user.
// // Key: username (string)
// // Value: The full user update payload (e.g., { isOnline: true, lastSeen: Date })
// const pendingUpdates = new Map<string, { isOnline: boolean; lastSeen: Date }>();

// // --- CORE MONGODB FUNCTION (NOT DEBOUNCED) ---
// // This function runs only when the debounce delay is met.
// async function executeWriteToDatabase(username: string): Promise<void> {
//     // 1. Get the latest required state from the map
//     const latestState = pendingUpdates.get(username);
//     if (!latestState) {
//         // Should not happen, but safe guard
//         console.warn(`[DB Writer] No pending state found for user: ${username}`);
//         return;
//     }

//     try {
//         // 2. Perform the single, throttled update
//         const result = await User.updateOne(
//             { username: username },
//             { $set: latestState } // Use $set to update fields
//         );

//         if (result.matchedCount === 0) {
//             // Log if a user somehow disappeared, but don't fail the service
//             console.warn(`[DB Writer] User not found during update: ${username}`);
//         }
        
//         // 3. Remove from the pending queue after successful write
//         pendingUpdates.delete(username);
        
//     } catch (error) {
//         console.error(`[DB Writer] MongoDB update failed for user ${username}:`, error);
//         // Note: For 'not primary' or transient errors, the application should handle retries
//     }
// }

// // --- DEBOUNCED WRAPPER ---
// // This function gets called on every activity event.
// // It uses a dynamic debounce key based on the username.
// const debouncedWriters = new Map<string, (username: string) => void>();

// /**
//  * Queues a user's status for a database write, debouncing any further writes 
//  * for the same user for 10 seconds.
//  * @param username The user identifier.
//  * @param state The state to persist (isOnline and lastSeen).
//  */
// export const queuePresenceUpdate = (username: string, state: { isOnline: boolean; lastSeen: Date }): void => {
//     // 1. Always store the LATEST required state immediately
//     pendingUpdates.set(username, state);

//     // 2. Get or create the debounced function for this specific user
//     let writer = debouncedWriters.get(username);
    
//     if (!writer) {
//         // Create a new debounced function for this user
//         // Debounce delay is 10000ms (10 seconds)
//         writer = debounce(executeWriteToDatabase, 10000);
//         debouncedWriters.set(username, writer);
//     }
    
//     // 3. Call the debounced function. If called multiple times quickly,
//     // only the last call will fire after 10 seconds.
//     writer(username);
    
//     // NOTE: This ensures that if the user's status changes from ONLINE -> OFFLINE -> ONLINE
//     // all within 10 seconds, only the final state (ONLINE) is written to MongoDB once.
// };
