/**
 * This script should be executed to initialize the database with the first migration.
 * 
 * Run this with:
 * npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/migrations-init.ts
 */
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

async function main() {
  console.log('🚀 Initializing PSADT Pro database...');
  
  try {
    // Check if database exists by running prisma db pull
    console.log('📊 Checking database connection...');
    
    try {
      await execAsync('npx prisma db pull');
      console.log('✅ Database connection successful!');
    } catch (error) {
      console.error('❌ Database connection failed. Please check your DATABASE_URL in .env file.');
      process.exit(1);
    }
    
    // Generate migration
    console.log('📝 Creating initial migration...');
    await execAsync('npx prisma migrate dev --name init');
    console.log('✅ Initial migration created!');
    
    // Generate Prisma client
    console.log('🔧 Generating Prisma client...');
    await execAsync('npx prisma generate');
    console.log('✅ Prisma client generated!');
    
    // Create storage directory if it doesn't exist
    const storagePath = path.join(process.cwd(), 'storage');
    if (!fs.existsSync(storagePath)) {
      console.log('📁 Creating storage directory...');
      fs.mkdirSync(storagePath, { recursive: true });
      console.log('✅ Storage directory created!');
    }
    
    console.log('\n🎉 Database initialization completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Run "npm run db:seed" to populate the database with sample data.');
    console.log('2. Run "npm run dev" to start the development server.');
    console.log('3. Visit http://localhost:3000 in your browser.');
    
  } catch (error) {
    console.error('❌ An error occurred during database initialization:', error);
    process.exit(1);
  }
}

main(); 