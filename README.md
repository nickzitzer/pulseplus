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