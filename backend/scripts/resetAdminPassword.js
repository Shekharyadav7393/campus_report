import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/campus-rapid-report';
const DEFAULT_PASSWORD = 'admin123';

console.log('Resetting admin password...\n');

mongoose
  .connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(async () => {
    console.log(' Connected to MongoDB successfully!\n');
    const admin = await User.findOne({ 
      email: { $regex: /^admin@campus\.com$/i },
      role: 'admin'
    });
    
    if (!admin) {
      console.log('Admin user not found!');
      console.log('Creating new admin user...\n');
      
    
      const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);
      const newAdmin = await User.create({
        name: 'Admin',
        email: 'admin@campus.com',
        password: hashedPassword,
        role: 'admin'
      });
      
      console.log('Admin user created successfully!\n');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(' Email:    admin@campus.com');
      console.log('Password: admin123');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    } else {
      console.log('Found admin user: ' + admin.name);
      console.log('Resetting password...\n');
      
      const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);
      admin.password = hashedPassword;
      await admin.save();
      
      console.log('Admin password reset successfully!\n');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Email:    admin@campus.com');
      console.log(' Password: admin123');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }
    
    await mongoose.connection.close();
    process.exit(0);
  })
  .catch(err => {
    console.error('\n Error resetting admin password:');
    console.error(err.message);
    console.error('\n Please check:');
    console.error('   1. MongoDB is running');
    console.error('   2. MONGODB_URI in .env file is correct\n');
    process.exit(1);
  });

