const { execSync } = require('child_process');
const fs = require('fs');

console.log('🚀 Starting GitHub Pages deployment...');

try {
  // Build the project
  console.log('📦 Building project...');
  execSync('npm run build', { stdio: 'inherit' });

  // Check if build directory exists
  if (!fs.existsSync('build')) {
    throw new Error('Build directory not found!');
  }

  // Deploy to GitHub Pages
  console.log('🌐 Deploying to GitHub Pages...');
  
  // If using gh-pages package
  try {
    execSync('npx gh-pages -d build', { stdio: 'inherit' });
    console.log('✅ Successfully deployed to GitHub Pages!');
  } catch (error) {
    console.log('📋 Manual deployment instructions:');
    console.log('1. Install gh-pages: npm install --save-dev gh-pages');
    console.log('2. Add to package.json scripts: "deploy": "gh-pages -d build"');
    console.log('3. Run: npm run deploy');
    console.log('4. Or manually upload the build folder to your GitHub Pages branch');
  }

} catch (error) {
  console.error('❌ Deployment failed:', error.message);
  process.exit(1);
} 