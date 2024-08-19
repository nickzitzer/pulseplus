const fs = require('fs');
const path = require('path');

const envFile = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envFile, 'utf8');

const environments = ['development', 'staging', 'production'];

environments.forEach(env => {
  let envSpecificContent = envContent;
  
  // Modify variables based on environment
  if (env === 'production' || env === 'staging') {
    envSpecificContent = envSpecificContent.replace('NODE_ENV=development', `NODE_ENV=${env}`);
    envSpecificContent = envSpecificContent.replace('http://localhost:3000', `https://${env}-your-domain.com`);
    // Update ECR image tags for production/staging if needed
    envSpecificContent = envSpecificContent.replace(':latest', `:${env}`);
    // Add more environment-specific modifications here
  }

  // Write to environment-specific files
  fs.writeFileSync(path.join(__dirname, '..', `.env.${env}`), envSpecificContent);
  
  // Generate ECS task definition template
  const taskDefinition = {
    containerDefinitions: [
      {
        name: "frontend",
        image: "${FRONTEND_IMAGE}",
        essential: true,
        portMappings: [
          {
            containerPort: parseInt("${FRONTEND_CONTAINER_PORT}"),
            hostPort: parseInt("${FRONTEND_HOST_PORT}")
          }
        ],
        environment: [
          { name: "NEXT_PUBLIC_API_URL", value: "${NEXT_PUBLIC_API_URL}" },
          { name: "NEXT_PUBLIC_BASE_URL", value: "${NEXT_PUBLIC_BASE_URL}" }
        ],
        memory: parseInt("${FRONTEND_MEMORY}"),
        cpu: parseInt("${FRONTEND_CPU}")
      },
      {
        name: "backend",
        image: "${BACKEND_IMAGE}",
        essential: true,
        portMappings: [
          {
            containerPort: parseInt("${BACKEND_CONTAINER_PORT}"),
            hostPort: parseInt("${BACKEND_HOST_PORT}")
          }
        ],
        environment: [
          { name: "PORT", value: "${PORT}" },
          { name: "NODE_ENV", value: "${NODE_ENV}" },
          { name: "POSTGRES_URL", value: "${POSTGRES_URL}" }
        ],
        secrets: [
          { name: "JWT_SECRET", valueFrom: "${JWT_SECRET_ARN}" },
          { name: "SESSION_SECRET", valueFrom: "${SESSION_SECRET_ARN}" }
        ],
        memory: parseInt("${BACKEND_MEMORY}"),
        cpu: parseInt("${BACKEND_CPU}")
      }
    ],
    family: "pulseplus-task",
    networkMode: "awsvpc",
    requiresCompatibilities: ["FARGATE"],
    cpu: "${TASK_CPU}",
    memory: "${TASK_MEMORY}"
  };

  const taskDefinitionContent = JSON.stringify(taskDefinition, null, 2);
  fs.writeFileSync(path.join(__dirname, '..', `task-definition.${env}.json`), taskDefinitionContent);
});

console.log('Environment files and ECS task definitions generated successfully.');