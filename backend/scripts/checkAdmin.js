import User from '../models/User.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/campus-rapid-report';

console.log('🔍 Checking for admin user...\n');

mongoose
  .connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(async () => {
    console.log('Connected to MongoDB successfully!\n');
    
    const admin = await User.findOne({ 
      email: { $regex: /^admin@campus\.com$/i },
      role: 'admin'
    });
    
    if (admin) {
      console.log('Admin user found!\n');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(' Email:    admin@campus.com');
      console.log(' Name:     ' + admin.name);
      console.log(' Role:     ' + admin.role);
      console.log(' Created:  ' + admin.createdAt);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log(' Password: admin123 (default)\n');
      console.log(' If login fails, run: npm run create-admin\n');
    } else {
      console.log(' Admin user NOT found!\n');
      console.log(' To create admin user, run:');
      console.log('   npm run create-admin\n');
    }
    
    await mongoose.connection.close();
    process.exit(0);
  })
  .catch(err => {
    console.error('\n Error connecting to database:');
    console.error(err.message);
    console.error('\n Please check:');
    console.error('   1. MongoDB is running');
    console.error('   2. MONGODB_URI in .env file is correct\n');
    process.exit(1);
  });

