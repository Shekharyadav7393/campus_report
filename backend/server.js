import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import complaintRoutes from './routes/complaintRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/auth', authRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (req, res) => {
  res.json({ 
    message: 'Server is running',
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
  });
})
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/campus-rapid-report';
const PORT = process.env.PORT || 5000;
const mongooseOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
};
const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI && !MONGODB_URI.includes('mongodb://localhost')) {
      console.warn(' Warning: MONGODB_URI not set in .env file');
      console.warn(' Using default local MongoDB connection');
    }

    const conn = await mongoose.connect(MONGODB_URI, mongooseOptions);
    
    console.log('MongoDB Connected Successfully!');
    mongoose.connection.on('error', (err) => {
      console.error(' MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected successfully');
    });

    // Start server after successful database connection
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });

  } catch (error) {
    console.error(' MongoDB connection failed:', error.message);
    console.error('\n📝 Please check:');
    console.error('   1. MongoDB is running (if using local MongoDB)');
    console.error('   2. MONGODB_URI in .env file is correct');
    console.error('   3. Network connection (if using MongoDB Atlas)');
    console.error('\n Default connection string: mongodb://localhost:27017/campus-rapid-report');
    process.exit(1);
  }
};

process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('\n MongoDB connection closed due to app termination');
  process.exit(0);
});
connectDB();

export default app;

