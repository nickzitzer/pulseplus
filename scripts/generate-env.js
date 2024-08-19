const fs = require('fs');
const path = require('path');

const envFile = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envFile, 'utf8');

const environments = ['development', 'production'];

environments.forEach(env => {
  let envSpecificContent = envContent;
  
  // Modify variables based on environment
  if (env === 'production') {
    envSpecificContent = envSpecificContent.replace('NODE_ENV=development', 'NODE_ENV=production');
    envSpecificContent = envSpecificContent.replace('http://localhost:3000', 'https://your-production-url.com');
    // Update ECR image tags for production if needed
    envSpecificContent = envSpecificContent.replace(':latest', ':production');
    // Add more production-specific modifications here
  }

  // Write to environment-specific files
  fs.writeFileSync(path.join(__dirname, '..', `.env.${env}`), envSpecificContent);
  
  // Generate Elastic Beanstalk config
  const ebConfig = envSpecificContent.split('\n')
    .filter(line => line.trim() !== '' && !line.startsWith('#'))
    .map(line => {
      const [key, value] = line.split('=');
      return `  ${key}: ${value}`;
    })
    .join('\n');

  const ebConfigContent = `option_settings:\n  aws:elasticbeanstalk:application:environment:\n${ebConfig}`;
  fs.writeFileSync(path.join(__dirname, '..', `.ebextensions/env.config`), ebConfigContent);

  // Generate Dockerrun.aws.json with environment variables
  const dockerrunTemplate = fs.readFileSync(path.join(__dirname, '..', 'Dockerrun.aws.json'), 'utf8');
  const dockerrunContent = dockerrunTemplate.replace(/\$\{([A-Z_]+)\}/g, (match, p1) => {
    const value = envSpecificContent.match(new RegExp(`${p1}=(.*)`))?.[1];
    return value || match;  // If no value found, keep the original placeholder
  });
  fs.writeFileSync(path.join(__dirname, '..', `Dockerrun.aws.${env}.json`), dockerrunContent);
});

console.log('Environment files and Dockerrun.aws.json generated successfully.');