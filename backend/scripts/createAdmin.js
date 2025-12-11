import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/campus-rapid-report';

console.log(' Connecting to MongoDB...');
console.log(` Database: ${MONGODB_URI.replace(/\/\/.*@/, '//***:***@')}`);

mongoose
  .connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(async () => {
    console.log('Connected to MongoDB successfully!\n');
    const existingAdmin = await User.findOne({ 
      email: { $regex: /^admin@campus\.com$/i },
      role: 'admin'
    });
    if (existingAdmin) {
      console.log('Admin user already exists!');
      console.log(' Email: admin@campus.com');
      console.log(' Default password: admin123');
      console.log('\n To reset password, run: npm run reset-admin\n');
      process.exit(0);
    }
    console.log(' Creating admin user...');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const admin = await User.create({
      name: 'Admin',
      email: 'admin@campus.com',
      password: hashedPassword,
      role: 'admin'
    });
    
    console.log('\n Admin user created successfully!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(' Email:    admin@campus.com');
    console.log(' Password: admin123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('  IMPORTANT: Change the password after first login!\n');
    
    await mongoose.connection.close();
    process.exit(0);
  })
  .catch(err => {
    console.error('\n Error creating admin user:');
    console.error(err.message);
    console.error('\n Please check:');
    console.error('   1. MongoDB is running');
    console.error('   2. MONGODB_URI in .env file is correct');
    console.error('   3. Database connection is accessible\n');
    process.exit(1);
  });

