/**
 * Script to update package.json with required dependencies
 * for PSADT Pro UI enhancements
 */

const fs = require('fs');
const path = require('path');

// Path to package.json
const packageJsonPath = path.join(__dirname, '..', 'package.json');

// Check if package.json exists
if (!fs.existsSync(packageJsonPath)) {
  console.error('Error: package.json not found at', packageJsonPath);
  process.exit(1);
}

// Read package.json
let packageJson;
try {
  const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');
  packageJson = JSON.parse(packageJsonContent);
} catch (error) {
  console.error('Error reading package.json:', error);
  process.exit(1);
}

// New dependencies to add
const newDependencies = {
  '@codingame/monaco-jsonrpc': '^0.3.1',
  'monaco-languageclient': '^4.0.3',
  'vscode-languageserver-protocol': '^3.16.0'
};

// New dev dependencies to add
const newDevDependencies = {
  'node-fetch': '^2.6.7',
  'cheerio': '^1.0.0-rc.12'
};

// Update dependencies
packageJson.dependencies = {
  ...packageJson.dependencies,
  ...newDependencies
};

// Update devDependencies
packageJson.devDependencies = {
  ...packageJson.devDependencies,
  ...newDevDependencies
};

// Add script for updating grammar
if (!packageJson.scripts) {
  packageJson.scripts = {};
}

packageJson.scripts['update-grammar'] = 'node scripts/documentation-parser.js';

// Write updated package.json
try {
  fs.writeFileSync(
    packageJsonPath,
    JSON.stringify(packageJson, null, 2) + '\n',
    'utf8'
  );
  console.log('Successfully updated package.json with required dependencies');
} catch (error) {
  console.error('Error writing package.json:', error);
  process.exit(1);
}

console.log('Package.json updated successfully. Run npm install to install new dependencies.');
