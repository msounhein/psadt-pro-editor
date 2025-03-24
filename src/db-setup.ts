import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database setup with sample data...');

  // Create demo user
  const passwordHash = await bcrypt.hash('password123', 10);
  
  const user = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {},
    create: {
      id: uuidv4(),
      email: 'demo@example.com',
      name: 'Demo User',
      password: passwordHash,
    },
  });
  
  console.log(`Created demo user: ${user.email}`);
  
  // Create sample templates
  const templateTypes = ['MSI', 'EXE', 'ZIP', 'Script'];
  
  for (let i = 0; i < 4; i++) {
    const template = await prisma.template.create({
      data: {
        id: uuidv4(),
        name: `Sample ${templateTypes[i]} Template`,
        description: `A sample template for ${templateTypes[i]} package deployments`,
        packageType: templateTypes[i],
        isPublic: i < 2, // Make the first two templates public
        userId: user.id,
      },
    });
    
    console.log(`Created template: ${template.name}`);
    
    // Create sample packages for each template
    for (let j = 0; j < 2; j++) {
      // Create packageData as a JSON string for SQLite compatibility
      const packageData = JSON.stringify({
        installCommand: templateTypes[i] === 'MSI' 
          ? `msiexec /i Sample${j}.msi /qn` 
          : `Sample${j}.exe /S`,
        uninstallCommand: templateTypes[i] === 'MSI'
          ? `msiexec /x {PRODUCT-CODE} /qn`
          : `Uninstall.exe /S`,
        parameters: [
          { name: 'Silent', value: 'true' },
          { name: 'LogOutput', value: 'C:\\Logs\\' },
        ],
      });
      
      const package_ = await prisma.package.create({
        data: {
          id: uuidv4(),
          name: `Sample ${templateTypes[i]} Package ${j + 1}`,
          version: `1.${j}.0`,
          packageData,
          status: j === 0 ? 'published' : 'draft',
          userId: user.id,
          templateId: template.id,
        },
      });
      
      console.log(`Created package: ${package_.name}`);
      
      // Create stats for the package
      // Store deployment data as JSON string
      const deploymentData = JSON.stringify({
        lastEvent: `Deployment ${j === 0 ? 'succeeded' : 'failed'}`,
        timestamp: new Date().toISOString(),
      });
      
      await prisma.packageStatistics.create({
        data: {
          id: uuidv4(),
          packageId: package_.id,
          totalDownloads: Math.floor(Math.random() * 100),
          successfulDeploys: Math.floor(Math.random() * 50),
          failedDeploys: Math.floor(Math.random() * 10),
          lastDeployed: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000),
          deploymentData,
        },
      });
      
      console.log(`Created statistics for package: ${package_.name}`);
    }
  }
  
  console.log('Database setup completed!');
  console.log('You can now log in with:');
  console.log('Email: demo@example.com');
  console.log('Password: password123');
}

main()
  .catch((e) => {
    console.error('Error during database setup:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 