<#
.SYNOPSIS
    Complete setup script for PSADT Pro UI.

.DESCRIPTION
    This script performs the complete setup for PSADT Pro UI:
    1. Sets up the required directories
    2. Initializes the SQLite database
    3. Creates a demo user for login
    4. Prepares the environment for development

.EXAMPLE
    PS C:\> .\scripts\setup.ps1

    Performs the complete initial setup for PSADT Pro UI.
#>

Write-Host "Starting PSADT Pro UI Setup..." -ForegroundColor Cyan
Write-Host "--------------------------------" -ForegroundColor Cyan

# Create required directories
Write-Host "Creating required directories..." -ForegroundColor Yellow
$directories = @("storage", "templates", "psadt", "uploads")
foreach ($dir in $directories) {
    if (-not (Test-Path -Path $dir)) {
        New-Item -ItemType Directory -Path $dir | Out-Null
        Write-Host "Created directory: $dir" -ForegroundColor Green
    } else {
        Write-Host "Directory already exists: $dir" -ForegroundColor Green
    }
}

# Copy .env.example to .env if .env doesn't exist
if (-not (Test-Path -Path ".env")) {
    if (Test-Path -Path ".env.example") {
        Copy-Item -Path ".env.example" -Destination ".env"
        Write-Host "Created .env file from template" -ForegroundColor Green
    } else {
        Write-Host "Warning: .env.example not found. Please create a .env file manually." -ForegroundColor Yellow
    }
}

# Run database setup
Write-Host "Setting up SQLite database..." -ForegroundColor Yellow
& npm run db:sqlite
Write-Host "Database setup completed" -ForegroundColor Green

# Create demo user
Write-Host "Creating demo user..." -ForegroundColor Yellow
if (-not (Test-Path -Path "create-demo-user.js")) {
    # Create the demo user script
    $content = @'
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
'@
    Set-Content -Path "create-demo-user.js" -Value $content
}

# Run the demo user script
& node create-demo-user.js
Write-Host "Demo user setup completed" -ForegroundColor Green

Write-Host ""
Write-Host "Setup completed successfully!" -ForegroundColor Green
Write-Host "--------------------------------" -ForegroundColor Cyan
Write-Host "You can now start the development server with: npm run dev" -ForegroundColor Cyan
Write-Host "Then visit: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Login credentials:" -ForegroundColor White
Write-Host "  Email: demo@example.com" -ForegroundColor White
Write-Host "  Password: password123" -ForegroundColor White
Write-Host ""
Write-Host "If you encounter any issues, check the README.md for troubleshooting" -ForegroundColor Yellow 