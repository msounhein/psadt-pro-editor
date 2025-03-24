const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('Creating demo user...');

  // Create demo user
  const passwordHash = await bcrypt.hash('password123', 10);
  
  const user = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {},
    create: {
      email: 'demo@example.com',
      name: 'Demo User',
      password: passwordHash,
    },
  });
  
  console.log(`Created demo user: ${user.email}`);
  console.log('You can now log in with:');
  console.log('Email: demo@example.com');
  console.log('Password: password123');
}

main()
  .catch((e) => {
    console.error('Error creating demo user:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 