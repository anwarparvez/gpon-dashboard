import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import clientPromise from '@/lib/mongodb-client';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME || "gpon-dashboard");
    const usersCollection = db.collection("users");
    
    // Check if user exists
    const existingUser = await usersCollection.findOne({ email: 'admin@gpon.com' });
    if (existingUser) {
      return NextResponse.json({ 
        message: 'Test user already exists',
        user: {
          email: existingUser.email,
          hasPassword: !!existingUser.password,
          role: existingUser.role
        }
      });
    }
    
    // Hash password - "admin123"
    const hashedPassword = await bcrypt.hash('admin123', 10);
    console.log("Hashed password:", hashedPassword);
    
    // Create user
    const result = await usersCollection.insertOne({
      name: 'Admin User',
      email: 'admin@gpon.com',
      password: hashedPassword,
      role: 'admin',
      emailVerified: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    return NextResponse.json({ 
      message: 'Test user created successfully',
      userId: result.insertedId,
      email: 'admin@gpon.com',
      password: 'admin123'
    });
  } catch (error) {
    console.error('Error creating test user:', error);
    return NextResponse.json({ error: 'Failed to create test user' }, { status: 500 });
  }
}