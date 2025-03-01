# PulsePlus - Gamification Platform
<img src="https://lirp.cdn-website.com/961896a7/dms3rep/multi/opt/Happy-Technologies2_1-2eb04a18-7c7b56d3-600w.png" alt="Happy Technologies LLC" style="width:200px; padding-left: calc(50% - 100px)" />

PulsePlus is a powerful gamification platform developed by Happy Technologies LLC. This README provides instructions for setting up and running the application.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Database Setup](#database-setup)
5. [Running the Application](#running-the-application)
6. [Development](#development)
7. [Deployment](#deployment)
8. [Support](#support)
9. [Documentation](#documentation)

## Prerequisites

Before you begin, ensure you have the following installed:

- Node.js (v18 or later)
- npm (v7 or later)
- PostgreSQL (v12 or later)
- Docker and Docker Compose (for containerized deployment)

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/your-repo/pulseplus.git
   cd pulseplus
   ```

2. Install dependencies for both frontend and backend:
   ```
   npm run install
   ```

## Configuration

1. Create a `.env` file in the root directory based on the `.env.example` file:
   ```
   cp .env.example .env
   ```

2. Update the `.env` file with your specific configuration values, including database credentials and API keys.

3. Synchronize environment variables to frontend, backend, and deployment directories:
   ```
   npm run sync-all-env
   ```
   
   This script copies the relevant environment variables from the root `.env` file to:
   
   - **Frontend directory**: Variables from SHARED and FRONTEND-SPECIFIC sections
   - **Backend directory**: Variables from SHARED and BACKEND-SPECIFIC sections
   - **Docker Compose directory**: All variables for containerized deployment
   
   The root `.env` file is organized into three sections:
   
   - **SHARED CONFIGURATION**: Variables used by both frontend and backend
   - **FRONTEND-SPECIFIC CONFIGURATION**: Variables used only by the frontend
   - **BACKEND-SPECIFIC CONFIGURATION**: Variables used only by the backend
   
   Always edit the root `.env` file and then run `npm run sync-all-env` to propagate changes. The generated `.env` files are auto-generated and should not be edited directly.

4. Generate environment-specific files and ECS task definitions:
   ```
   npm run generate-env
   ```

## Database Setup

1. Ensure your PostgreSQL server is running.

2. Create a new database for PulsePlus.

3. Run the database setup script:
   ```
   npm run rebuild-db
   ```

This script will create the necessary tables and insert initial data.

## Running the Application

1. Start the application using Docker Compose:
   ```
   npm run docker:up
   ```
   This command automatically synchronizes environment variables before starting the containers.

2. Access the frontend at `http://localhost:3000` and the backend at `http://localhost:3001`.

3. Other Docker Compose commands:
   ```
   npm run docker:down     # Stop all containers
   npm run docker:build    # Rebuild all containers
   npm run docker:restart  # Restart all containers
   ```
   All these commands ensure environment variables are synchronized before execution.

## Development

- To run the frontend in development mode:
  ```
  cd frontend
  npm run dev
  ```

- To run the backend in development mode:
  ```
  cd backend
  npm run dev
  ```

## Deployment

1. Build the Docker images:
   ```
   docker-compose build
   ```

2. Push the images to your container registry (e.g., ECR for AWS):
   ```
   docker push your-registry/pulseplus-frontend:latest
   docker push your-registry/pulseplus-backend:latest
   ```

3. Deploy using your preferred method (e.g., ECS, Kubernetes, etc.)

## Support

For any questions or issues, please contact support@happy-tech.biz or visit our website at [https://happy-tech.biz](https://happy-tech.biz).

---

© 2024 Happy Technologies LLC. All rights reserved.

---

## Credentials for Testing

1. John Doe (USER):
```
Username: john.doe
Password: P@8xK2#mL9qF5$vN
```
2. Jane Smith (MANAGER):
```
Username: jane.smith
Password: R@7zJ3$nH6wT9#bM
```
3. Bob Johnson (USER):
```
Username: bob.johnson
Password: G@5yC8#fD2sX7$pQ
```
4. Alice Williams (ADMIN):
```
Username: alice.williams
Password: W@3tB6$kM4nL9#hF
```
5. Eric Singer (ADMIN):
```
Username: eric.singer
Password: Z@9qN7#xV2mS5$jH
```
6. Dan Romano (ADMIN):
```
Username: dan.romano
Password: Y@6wF4$cT8pK3#bL
```
7. Nick Zitzer (ADMIN):
```
Username: nick.zitzer
Password: U@2mH9#rJ7sN5$xQ
```

# PulsePlus Game Platform API

## Overview
This is the API documentation for the PulsePlus gaming and engagement platform. The API provides endpoints for managing game mechanics, user interactions, and social features.

## Base URL
All API endpoints are prefixed with `/api`

## Authentication
All endpoints require Bearer token authentication:
```
Authorization: Bearer <token>
```

## API Endpoints

### Authentication & User Management
- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `POST /auth/logout` - User logout
- `POST /auth/refresh` - Refresh access token
- `GET /users/me` - Get current user profile
- `PUT /users/me` - Update user profile
- `GET /users/preferences` - Get user preferences
- `PUT /users/preferences` - Update user preferences
- `GET /users/sessions` - Get user sessions

### Game Management
- `POST /games` - Create game
- `GET /games/{gameId}` - Get game details
- `PUT /games/{gameId}` - Update game
- `GET /games/{gameId}/stats` - Get game statistics
- `GET /games/{gameId}/settings` - Get game settings
- `PUT /games/{gameId}/settings` - Update game settings

### Social Features
- `GET /social/feed` - Get user's social feed
- `POST /social/feeds` - Create a new social feed post
- `POST /social/feeds/{feedId}/interact` - Interact with a feed post
- `POST /social/chat/groups` - Create chat group
- `GET /social/chat/groups/{groupId}/messages` - Get chat messages
- `POST /social/chat/groups/{groupId}/messages` - Send chat message

### Season Management
- `POST /seasons` - Create season
- `GET /seasons/{seasonId}` - Get season details
- `PUT /seasons/{seasonId}` - Update season details
- `POST /seasons/{seasonId}/end` - End season and process final rankings
- `POST /seasons/tiers` - Create season tier

### Economy & Trading
- `GET /economy/balance` - Get user's currency balance
- `GET /economy/transactions` - Get user's transaction history
- `GET /economy/shop` - Get shop items
- `POST /economy/shop/{itemId}/purchase` - Purchase shop item
- `GET /economy/balance/{competitorId}` - Get competitor's currency balance
- `POST /economy/transfer` - Transfer currency between competitors
- `GET /economy/history/{competitorId}` - Get competitor's transaction history
- `POST /economy/shops` - Create shop
- `GET /economy/shops/{shopId}` - Get shop details

### Analytics
- `GET /analytics/performance/{gameId}` - Get game performance metrics
- `GET /analytics/engagement/{gameId}` - Get game engagement metrics
- `GET /analytics/revenue/{gameId}` - Get game revenue metrics
- `GET /analytics/progression/{gameId}` - Get game progression metrics
- `GET /analytics/competitors/{competitorId}` - Get competitor analytics
- `POST /analytics/reports/games/{gameId}` - Generate analytics report

### Surveys & Feedback
- `POST /surveys` - Create survey
- `GET /surveys/{surveyId}` - Get survey details
- `PUT /surveys/{surveyId}` - Update survey
- `POST /surveys/{surveyId}/questions` - Add questions to survey
- `PUT /surveys/{surveyId}/questions/{questionId}` - Update survey question
- `DELETE /surveys/{surveyId}/questions/{questionId}` - Delete survey question
- `POST /surveys/{surveyId}/responses` - Submit survey responses
- `GET /surveys/{surveyId}/responses/summary` - Get survey response summary

### Notifications
- `GET /notifications` - Get notifications
- `POST /notifications/mark-read` - Mark notifications as read
- `GET /notifications/settings` - Get notification settings
- `PUT /notifications/settings` - Update notification settings

## Common Query Parameters
Most list endpoints support the following query parameters:
- `page` (integer): Page number for pagination
- `limit` (integer): Number of items per page (default: 20, max: 50)
- `offset` (integer): Offset for pagination
- `timeframe` (string): Time range for analytics (7d, 30d, 90d, ALL)

## Response Format
All responses follow the format:
```json
{
  "success": boolean,
  "data": object,
  "error": {
    "code": string,
    "message": string,
    "details": object
  }
}
```

## Error Responses
Common error responses include:
- `400 Bad Request` - Invalid request parameters
- `401 Unauthorized` - Missing or invalid authentication
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `429 Too Many Requests` - Rate limit exceeded

# PulsePlus Infrastructure

This repository contains the infrastructure as code (IaC) for the PulsePlus application using AWS CDK. The infrastructure is designed for production-grade deployment with high availability, security, and scalability.

## Architecture Overview

The infrastructure consists of:

- **VPC Configuration**
  - Multi-AZ deployment (2 AZs)
  - Public, Private, and Isolated subnets
  - NAT Gateways for outbound traffic

- **Compute (ECS Fargate)**
  - Frontend Service (Next.js)
  - Backend Service (API)
  - Auto-scaling configuration
  - Container insights enabled

- **Database**
  - Amazon RDS PostgreSQL 13
  - Automated backups
  - Encrypted storage
  - Private subnet deployment

- **Security**
  - HTTPS/TLS encryption
  - WAF with rate limiting
  - Security groups for network isolation
  - Secrets management for sensitive data
  - HTTP to HTTPS redirection

- **Monitoring**
  - CloudWatch alarms for CPU and error rates
  - Container insights
  - Access and application logging

## Prerequisites

1. AWS CLI installed and configured
2. Node.js 14.x or later
3. AWS CDK CLI installed (`npm install -g aws-cdk`)
4. Domain name registered in Route53
5. Docker installed (for building container images)

## Deployment Instructions

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Domain**
   - Ensure your domain is registered in Route53
   - Note the hosted zone ID

3. **Build Docker Images**
   ```bash
   # Build frontend image
   docker build -t pulseplus-frontend ./frontend
   
   # Build backend image
   docker build -t pulseplus-backend ./backend
   ```

4. **Deploy Infrastructure**
   ```bash
   # Bootstrap CDK (first time only)
   cdk bootstrap

   # Deploy the stack
   cdk deploy --parameters domainName=your-domain.com --parameters environment=production
   ```

5. **Push Docker Images**
   ```bash
   # Login to ECR
   aws ecr get-login-password --region <region> | docker login --username AWS --password-stdin <account>.dkr.ecr.<region>.amazonaws.com

   # Tag and push frontend
   docker tag pulseplus-frontend:latest <frontend-repo-uri>:latest
   docker push <frontend-repo-uri>:latest

   # Tag and push backend
   docker tag pulseplus-backend:latest <backend-repo-uri>:latest
   docker push <backend-repo-uri>:latest
   ```

## Infrastructure Details

### Networking
- VPC with 3 subnet tiers (Public, Private, Isolated)
- 2 NAT Gateways for high availability
- Application Load Balancer in public subnets
- Services and database in private/isolated subnets

### Compute
- Frontend Service:
  - Memory: 1024 MiB
  - CPU: 512 units
  - Auto-scaling: 2-10 tasks
  - Scale on 70% CPU utilization

- Backend Service:
  - Memory: 1024 MiB
  - CPU: 512 units
  - Auto-scaling: 2-10 tasks
  - Scale on 70% CPU utilization

### Database
- Instance: t3.small
- Multi-AZ: No (upgrade for production if needed)
- Backup retention: 7 days
- Storage: Encrypted at rest
- Automated backups enabled

### Security
- WAF Rules:
  - Rate limiting: 2000 requests per IP
  - Customizable rule sets available

- SSL/TLS:
  - ACM-managed certificates
  - Automatic HTTPS redirection
  - Modern security protocols

### Monitoring
- CloudWatch Alarms:
  - High CPU utilization (90% threshold)
  - HTTP 5xx errors (10 errors threshold)
  - Custom metrics available through Container Insights

## Environment Variables

### Frontend
- `FRONTEND_PORT`: Port for the frontend service (default: 3000)
- `NEXT_PUBLIC_FRONTEND_URL`: Frontend URL
- `NEXT_PUBLIC_BACKEND_URL`: Backend API URL
- `NODE_ENV`: Environment name

### Backend
- `BACKEND_PORT`: Port for the backend service (default: 3001)
- `NODE_ENV`: Environment name
- `POSTGRES_HOST`: Database host (auto-configured)
- `POSTGRES_PORT`: Database port (auto-configured)
- `POSTGRES_DB`: Database name
- `JWT_SECRET`: JWT signing secret (for development/test environments only)
- `JWT_SECRET_ID`: ARN of the AWS Secrets Manager secret containing the JWT secret (REQUIRED for production/staging)
- `DB_SECRET_ID`: ARN of the AWS Secrets Manager secret containing database credentials (for production/staging)
- `SESSION_SECRET`: Session secret (from Secrets Manager in production)
- `DB_PASSWORD`: Database password (from Secrets Manager in production)

### Secrets Management

In production and staging environments, sensitive configuration values like JWT secrets and database credentials are stored in AWS Secrets Manager. The application will automatically retrieve these secrets at startup.

For local development, you can use the `.env` file with plaintext values. In production, the following environment variables should be set:

- `JWT_SECRET_ID`: ARN of the secret containing the JWT signing key (REQUIRED in production/staging)
- `DB_SECRET_ID`: ARN of the secret containing database credentials

The secrets should be structured as JSON objects with the following keys:
```json
{
  "username": "db-username",
  "password": "db-password",
  "jwt_secret": "jwt-signing-secret",
  "session_secret": "session-secret"
}
```

## Cost Optimization

Consider the following for cost optimization:
- NAT Gateway count can be reduced to 1 for non-production environments
- RDS instance size can be adjusted based on workload
- Auto-scaling parameters can be tuned based on usage patterns
- Reserved instances can be purchased for predictable workloads

## Troubleshooting

1. **Certificate Validation**
   - Ensure DNS validation records are created
   - Wait for certificate validation (can take up to 30 minutes)

2. **Database Connectivity**
   - Check security group rules
   - Verify subnet connectivity
   - Check credentials in Secrets Manager

3. **Service Health**
   - Monitor ECS service events
   - Check container logs in CloudWatch
   - Verify health check endpoints

## Support

For issues and support:
1. Check CloudWatch logs
2. Review ECS service events
3. Check security group configurations
4. Verify DNS records
5. Monitor ALB target group health

## Security Considerations

1. Rotate database credentials regularly
2. Monitor WAF rules and adjust as needed
3. Review security group rules periodically
4. Keep container images updated
5. Monitor CloudWatch logs for suspicious activity
6. Rotate API keys for external services regularly using the built-in API key rotation mechanism

## API Key Management

PulsePlus includes a secure API key management system that handles storage and rotation of API keys for external services:

1. **Secure Storage**: All API keys are stored in AWS Secrets Manager in production/staging environments
2. **Automatic Rotation**: API keys are automatically rotated based on configurable intervals (default: 30 days)
3. **Fallback Mechanism**: During rotation, both current and previous keys are maintained to ensure service continuity
4. **Admin Interface**: Administrators can manage API keys through the admin interface

### API Key Rotation Configuration

Configure API key rotation in your environment:

```
# API Key Rotation Configuration
API_KEY_ROTATION_ENABLED=true
API_KEY_ROTATION_INTERVAL=30 # days
API_KEY_SECRET_PREFIX=pulseplus/api-keys
```

### Managing API Keys

Administrators can manage API keys through the following endpoints:

- `GET /api/admin/api-keys` - List all API keys
- `GET /api/admin/api-keys/:serviceName` - Get API key metadata for a specific service
- `POST /api/admin/api-keys/rotate` - Rotate an API key
- `POST /api/admin/api-keys/register` - Register a service for API key rotation
- `POST /api/admin/api-keys/rotate-all` - Force rotation of all registered API keys

## Future Enhancements

Consider these potential improvements:
1. Multi-AZ RDS deployment
2. Additional WAF rules
3. Enhanced monitoring and alerting
4. Disaster recovery configuration
5. Blue/Green deployment setup

## Documentation

PulsePlus comes with comprehensive documentation built using [Nextra](https://nextra.site/), a Next.js-based documentation framework. All documentation has been consolidated into a single Nextra deployment for easier maintenance and access.

### Accessing the Documentation

The documentation is available in multiple ways:

1. **Local Development**:
   ```bash
   # Start the documentation development server
   npm run docs:dev
   ```
   This will start a development server at http://localhost:3000.

2. **Production Build**:
   ```bash
   # Build and start the documentation
   npm run docs:build
   npm run docs:start
   ```
   This will build and serve the documentation at http://localhost:3000.

3. **Docker Container**:
   ```bash
   # Build and run the documentation in a Docker container
   npm run docs:docker:build
   npm run docs:docker:run
   ```
   This will build and run the documentation in a Docker container at http://localhost:3000.

4. **Deployed Application**:
   When deployed with the main application, the documentation is available at the `/docs` path of your application URL:
   ```
   https://your-domain.com/docs
   ```

### Documentation Structure

The documentation is organized into the following sections:

- **Getting Started** - Installation, configuration, and basic setup
- **Architecture** - System design and architecture overview
- **Core Systems** - Detailed documentation of each major system component
- **Development Standards** - Coding standards and best practices
- **API Reference** - Complete API documentation with Swagger integration
- **Operations** - Deployment, monitoring, and maintenance guides
- **Security** - Security policies and procedures

### API Documentation

The API documentation is generated from the OpenAPI/Swagger specification and is available at:

- Local: `http://localhost:3000/api-docs`
- Production: `https://your-domain.com/api-docs`

### JSDoc Documentation

The JSDoc documentation is generated from code comments and is available at:

- Local: `http://localhost:3000/jsdoc`
- Production: `https://your-domain.com/docs/jsdoc`

### Contributing to Documentation

See the [Documentation README](./documentation/README.md) for information on how to contribute to the documentation.