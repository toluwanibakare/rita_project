/**
 * Global In-Memory Store
 * 
 * In a real application, you would connect to a database like PostgreSQL or Redis.
 * Because this is a lightweight prototype demonstrating real-time API security mitigation,
 * we use a simple JavaScript object to simulate a database.
 * 
 * We attach it to the `global` object so that Next.js Hot Module Replacement (HMR) 
 * doesn't wipe out our data every time we save a file in development.
 */
const globalStore = global.store || {
  logs: [],          // Stores every processed request to be fetched by the frontend dashboard
  deviceStates: {}   // Stores rate-limiting and anomaly-detection data organized by deviceId
};

// If we are in development mode, persist the store to `global`
if (process.env.NODE_ENV !== 'production') {
  global.store = globalStore;
}

export default globalStore;
