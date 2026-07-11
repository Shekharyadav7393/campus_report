import http from 'http';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { app } from './app.js';
import { SocketService } from './services/socket.service.js';
import { logger } from './utils/logger.js';

import { seedDatabase } from './utils/seeder.js';

// Load Env variables
dotenv.config();

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  logger.error('CRITICAL: MONGODB_URI is not defined in environment variables.');
  process.exit(1);
}

// Create HTTP Server
const server = http.createServer(app);

// Initialize Socket.io service
SocketService.init(server);

// Database Connection
mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    logger.info('Successfully connected to MongoDB Cluster.');
    
    // Seed default database entities
    await seedDatabase();
    
    // Start Server Listener
    server.listen(PORT, () => {
      logger.info(`CampusReport Backend running on port ${PORT}`);
    });
  })
  .catch((err) => {
    logger.error(`Database connection failed: ${err.message}`);
    process.exit(1);
  });

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: any) => {
  logger.error(`Unhandled Rejection: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err: any) => {
  logger.error(`Uncaught Exception: ${err.message}`);
  server.close(() => process.exit(1));
});
