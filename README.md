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

3. Generate environment-specific files and ECS task definitions:
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
   docker-compose up
   ```

2. Access the frontend at `http://localhost:3000` and the backend at `http://localhost:3001`.

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
- `POST /sso/login` - SSO login
- `GET /sso/callback` - SSO callback handler

### Game Core Features
- `POST /games` - Create game
- `GET /games/:id` - Get game details
- `PUT /games/:id` - Update game
- `PATCH /games/:id/status` - Update game status
- `GET /games/:id/stats` - Get game statistics
- `GET /games/:id/leaderboard` - Get game leaderboard
- `POST /games/:id/join` - Join game
- `PATCH /games/:id/config` - Update game configuration

### Teams & Competition
- `POST /teams` - Create team
- `GET /teams/:id` - Get team details
- `PUT /teams/:id` - Update team
- `POST /teams/:id/members` - Add team member
- `DELETE /teams/:id/members/:userId` - Remove team member
- `PUT /teams/:id/members/:userId` - Update member role
- `GET /teams/:id/performance` - Get team performance metrics

### Leaderboards & Rankings
- `POST /leaderboards` - Create leaderboard
- `GET /leaderboards/:id` - Get leaderboard details
- `GET /leaderboards/:id/entries` - Get leaderboard entries
- `PUT /leaderboards/:id` - Update leaderboard
- `POST /leaderboards/:id/reset` - Reset leaderboard

### Seasons & Battle Pass
- `POST /seasons` - Create season
- `GET /seasons/:id` - Get season details
- `PUT /seasons/:id` - Update season
- `POST /seasons/:id/end` - End season
- `POST /seasons/tiers` - Create season tier
- `GET /seasons/:id/progress/:competitorId` - Get season progress
- `POST /seasons/:id/battlepass/purchase` - Purchase battle pass
- `POST /seasons/:id/xp` - Add season XP
- `POST /seasons/:id/tiers/:tierId/claim` - Claim tier reward

### Player Progression
- `GET /progression/competitor/:competitorId` - Get competitor progress
- `GET /progression/milestones/:gameId/:competitorId` - Get competitor milestones
- `POST /progression/milestones` - Create milestone
- `PUT /progression/milestones/:id` - Update milestone
- `GET /progression/stats/:gameId` - Get progression stats
- `GET /progression/history/:competitorId` - Get competitor history

### Economy & Trading
- `GET /economy/balance/:competitorId` - Get currency balance
- `POST /economy/transfer` - Transfer currency
- `GET /economy/history/:competitorId` - Get currency history
- `POST /economy/shops` - Create shop
- `GET /economy/shops/:id` - Get shop details
- `POST /economy/shops/:id/items` - Add shop item
- `POST /economy/items/:id/purchase` - Purchase item
- `GET /economy/inventory/:competitorId` - Get inventory
- `POST /economy/inventory/:itemId/use` - Use inventory item

### Trading System
- `POST /trading/offers` - Create trade offer
- `GET /trading/offers/:id` - Get trade offer details
- `GET /trading/offers` - Get user's trades
- `POST /trading/offers/:id/respond` - Respond to trade offer
- `POST /trading/offers/:id/cancel` - Cancel trade offer
- `GET /trading/history` - Get trade history

### Customization
- `GET /customization/profile` - Get profile customization
- `PUT /customization/profile` - Update profile customization
- `POST /customization/avatar` - Update avatar
- `POST /customization/banner` - Update banner
- `GET /customization/available` - Get available customizations
- `POST /customization/purchase` - Purchase customization

### Social Features
- `GET /social/friends` - List friends
- `POST /social/friends/requests` - Send friend request
- `POST /social/friends/requests/:id/respond` - Respond to friend request
- `DELETE /social/friends/:id` - Remove friend
- `POST /social/feed` - Create social feed post
- `GET /social/feed` - Get social feed

### Chat System
- `POST /chat/groups` - Create chat group
- `GET /chat/groups` - Get user's chat groups
- `GET /chat/groups/:id` - Get group details
- `POST /chat/groups/:id/messages` - Send message
- `GET /chat/groups/:id/messages` - Get messages
- `POST /chat/groups/:id/members` - Add member
- `DELETE /chat/groups/:id/members/:userId` - Remove member
- `PUT /chat/groups/:id/members/:userId` - Update member role
- `POST /chat/groups/:id/read` - Mark messages as read
- `POST /chat/messages/:id/react` - React to message

### Notifications
- `GET /notifications` - Get notifications
- `GET /notifications/unread/count` - Get unread count
- `POST /notifications/:id/read` - Mark as read
- `POST /notifications/read/all` - Mark all as read
- `DELETE /notifications/:id` - Delete notification
- `GET /notifications/preferences` - Get notification preferences
- `PUT /notifications/preferences` - Update notification preferences

### Analytics & Management
- `GET /analytics/performance/:gameId` - Get performance metrics
- `GET /analytics/engagement/:gameId` - Get engagement metrics
- `GET /analytics/progression/:gameId` - Get progression metrics
- `GET /analytics/revenue/:gameId` - Get revenue metrics
- `GET /analytics/social/:gameId` - Get social metrics
- `GET /analytics/games/:gameId` - Get game analytics
- `GET /analytics/competitors/:competitorId` - Get competitor analytics
- `GET /analytics/system` - Get system metrics (admin only)
- `POST /analytics/reports/games/:gameId` - Generate analytics report

### Surveys & Feedback
- `POST /surveys` - Create survey
- `GET /surveys/:id` - Get survey details
- `POST /surveys/:id/responses` - Submit survey response
- `GET /surveys/:id/results` - Get survey results

## Query Parameters
Most list endpoints support the following query parameters:
- `page` (integer): Page number for pagination
- `limit` (integer): Number of items per page
- `sort` (string): Field to sort by
- `order` (string): Sort order (asc/desc)
- `filter` (object): Filter criteria
- `include` (array): Related resources to include

## Response Format
All responses follow the format:
```json
{
  "data": <response_data>,
  "message": "Success message",
  "status": 200
}
```

## Error Handling
Errors follow the format:
```json
{
  "message": "Error description",
  "code": "ERROR_CODE",
  "status": 400
}
```

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
- `JWT_SECRET`: JWT signing secret (from Secrets Manager)
- `SESSION_SECRET`: Session secret (from Secrets Manager)
- `DB_PASSWORD`: Database password (from Secrets Manager)

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

## Future Enhancements

Consider these potential improvements:
1. Multi-AZ RDS deployment
2. Additional WAF rules
3. Enhanced monitoring and alerting
4. Disaster recovery configuration
5. Blue/Green deployment setup