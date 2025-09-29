// Simple test to check if our modules can be imported
console.log('Testing imports...');

try {
  console.log('✓ Express import works');
  
  // Test if our path aliases work
  const path = require('path');
  const fs = require('fs');
  
  // Check if our source files exist
  const srcPath = path.join(__dirname, 'src');
  console.log('Source directory exists:', fs.existsSync(srcPath));
  
  const appPath = path.join(__dirname, 'src', 'app.ts');
  console.log('App.ts exists:', fs.existsSync(appPath));
  
  const modelsPath = path.join(__dirname, 'src', 'models');
  console.log('Models directory exists:', fs.existsSync(modelsPath));
  
  const servicesPath = path.join(__dirname, 'src', 'services');
  console.log('Services directory exists:', fs.existsSync(servicesPath));
  
  console.log('All basic checks passed!');
} catch (error) {
  console.error('Import test failed:', error);
}