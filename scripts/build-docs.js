#!/usr/bin/env node

/**
 * Documentation Build Script
 * 
 * This script automates the process of building and integrating documentation:
 * 1. Generates JSDoc documentation
 * 2. Processes API documentation
 * 3. Builds the Nextra documentation site
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  rootDir: path.resolve(__dirname, '..'),
  jsdocConfig: path.resolve(__dirname, '../documentation/nextra/jsdoc.config.json'),
  jsdocOutput: path.resolve(__dirname, '../documentation/nextra/public/jsdoc-output'),
  jsdocStaticDir: path.resolve(__dirname, '../documentation/nextra/public/jsdoc-static'),
  swaggerFile: path.resolve(__dirname, '../documentation/nextra/public/swagger.yaml'),
  swaggerOutputDir: path.resolve(__dirname, '../documentation/nextra/public/swagger-ui'),
  nextraDir: path.resolve(__dirname, '../documentation/nextra'),
};

// Ensure directories exist
function ensureDirectoryExists(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
}

// Run a command and log output
function runCommand(command, cwd = config.rootDir) {
  console.log(`Running: ${command}`);
  try {
    execSync(command, { cwd, stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error(`Error executing command: ${command}`);
    console.error(error.message);
    return false;
  }
}

// Generate JSDoc documentation
function generateJSDoc() {
  console.log('\n📚 Generating JSDoc documentation...');
  
  ensureDirectoryExists(config.jsdocOutput);
  
  // Check if jsdoc is installed
  try {
    execSync('npx jsdoc --version', { stdio: 'ignore' });
  } catch (error) {
    console.log('Installing JSDoc...');
    runCommand('npm install -g jsdoc');
  }
  
  // Generate JSDoc
  const success = runCommand(`npx jsdoc -c ${config.jsdocConfig} -d ${config.jsdocOutput}`);
  
  // Create a fallback index.html file regardless of whether JSDoc generation succeeded
  const jsdocFallbackHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PulsePlus JSDoc Documentation</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif;
      margin: 0;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
      line-height: 1.6;
    }
    h1 { color: #0070f3; margin-bottom: 10px; }
    h2 { color: #0070f3; margin-top: 30px; }
    p { margin-top: 20px; }
    a { color: #0070f3; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .card {
      border: 1px solid #eaeaea;
      border-radius: 5px;
      padding: 20px;
      margin-top: 20px;
      background-color: #f9f9f9;
    }
    code {
      background-color: #f1f1f1;
      padding: 2px 5px;
      border-radius: 3px;
      font-family: monospace;
    }
  </style>
</head>
<body>
  <h1>PulsePlus JSDoc Documentation</h1>
  
  ${success 
    ? '<p>Please navigate through the documentation using the links below or in the sidebar.</p>' 
    : `<div class="card">
        <h2>⚠️ Documentation Generation Issue</h2>
        <p>The JSDoc documentation could not be fully generated due to type expression parsing errors.</p>
        <p>The errors are related to TypeScript-style imports in JSDoc comments, such as <code>{import('express').Request}</code>, which JSDoc doesn't understand.</p>
        <p>To fix this issue, the type annotations in the codebase need to be updated to use JSDoc-compatible syntax.</p>
      </div>`
  }
  
  <h2>Available Documentation</h2>
  <p>You can still browse the available documentation files:</p>
  <ul>
    ${fs.existsSync(path.join(config.jsdocOutput, 'index.html')) 
      ? '<li><a href="./index.html">Main Documentation</a></li>' 
      : ''}
    ${fs.existsSync(path.join(config.jsdocOutput, 'global.html')) 
      ? '<li><a href="./global.html">Global</a></li>' 
      : ''}
  </ul>
  
  <h2>Return to Documentation</h2>
  <p><a href="/docs">← Back to main documentation</a></p>
</body>
</html>
  `.trim();
  
  // Write the fallback index.html file to the JSDoc output directory
  fs.writeFileSync(path.join(config.jsdocOutput, 'index.html'), jsdocFallbackHtml);
  console.log('✅ JSDoc fallback page created');
  
  // Copy to static directory if it exists
  ensureDirectoryExists(config.jsdocStaticDir);
  runCommand(`cp -r ${config.jsdocOutput}/* ${config.jsdocStaticDir}`);
  console.log('✅ JSDoc files copied to Nextra static directory');
  
  if (success) {
    console.log('✅ JSDoc documentation generated successfully');
  } else {
    console.error('❌ Failed to generate JSDoc documentation');
  }
  
  return success;
}

// Process Swagger documentation
function processSwagger() {
  console.log('\n📝 Processing Swagger documentation...');
  
  ensureDirectoryExists(config.swaggerOutputDir);
  
  // Copy Swagger YAML
  if (fs.existsSync(config.swaggerFile)) {
    fs.copyFileSync(config.swaggerFile, path.join(config.swaggerOutputDir, 'swagger.yaml'));
    console.log('✅ Swagger YAML copied to output directory');
    
    // Create index.html for Swagger UI - Using CDN links instead of node_modules
    const swaggerHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PulsePlus API Documentation</title>
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@4.18.3/swagger-ui.css" />
  <style>
    html { box-sizing: border-box; overflow: auto; }
    *, *:before, *:after { box-sizing: inherit; }
    body { margin: 0; background: #fafafa; }
    .swagger-ui .topbar { background-color: #0070f3; }
    .swagger-ui .info .title { color: #0070f3; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@4.18.3/swagger-ui-bundle.js"></script>
  <script>
    window.onload = function() {
      const ui = SwaggerUIBundle({
        url: "./swagger.yaml",
        dom_id: "#swagger-ui",
        deepLinking: true,
        presets: [SwaggerUIBundle.presets.apis],
        layout: "BaseLayout",
        supportedSubmitMethods: ["get", "post", "put", "delete", "patch"],
        validatorUrl: null
      });
    }
  </script>
</body>
</html>
    `.trim();
    
    fs.writeFileSync(path.join(config.swaggerOutputDir, 'index.html'), swaggerHtml);
    console.log('✅ Swagger UI index.html created');
    
    return true;
  } else {
    console.error(`❌ Swagger file not found: ${config.swaggerFile}`);
    return false;
  }
}

// Build Nextra documentation
function buildNextra() {
  console.log('\n🏗️ Building Nextra documentation...');
  
  // Install dependencies if needed
  if (!fs.existsSync(path.join(config.nextraDir, 'node_modules'))) {
    console.log('Installing Nextra dependencies...');
    runCommand('npm install', config.nextraDir);
  }
  
  // Build Nextra
  const success = runCommand('npm run build', config.nextraDir);
  
  if (success) {
    console.log('✅ Nextra documentation built successfully');
  } else {
    console.error('❌ Failed to build Nextra documentation');
  }
  
  return success;
}

// Main function
async function main() {
  console.log('🚀 Starting documentation build process...');
  
  const jsdocSuccess = generateJSDoc();
  const swaggerSuccess = processSwagger();
  
  // Continue with the build process even if JSDoc generation fails
  if (swaggerSuccess) {
    const nextraSuccess = buildNextra();
    
    if (nextraSuccess) {
      console.log('\n✨ Documentation build completed successfully!');
      console.log('You can now:');
      console.log('- Run "cd documentation/nextra && npm run start" to start the documentation server');
      console.log('- Deploy the documentation using Docker');
      
      if (!jsdocSuccess) {
        console.log('\n⚠️ Note: JSDoc documentation was not generated successfully.');
        console.log('The JSDoc UI link may not work properly until the JSDoc type expression issues are fixed.');
      }
    } else {
      console.error('\n❌ Documentation build failed at the Nextra build step');
      process.exit(1);
    }
  } else {
    console.error('\n❌ Documentation build failed at the preparation step');
    process.exit(1);
  }
}

// Run the main function
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 