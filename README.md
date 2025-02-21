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