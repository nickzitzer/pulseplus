#!/bin/bash

# Load environment variables from Docker Compose .env file
set -a
source deployment/docker/compose/.env
set +a

# ECR repository URL
ECR_REPO="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

# Login to ECR
echo "Logging in to Amazon ECR..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REPO

# Build and push frontend
echo "Building and pushing frontend..."
docker build -t pulseplus-frontend:latest ./frontend
docker tag pulseplus-frontend:latest $ECR_REPO/pulseplus-frontend:latest
docker push $ECR_REPO/pulseplus-frontend:latest

# Build and push backend
echo "Building and pushing backend..."
docker build -t pulseplus-backend:latest ./backend
docker tag pulseplus-backend:latest $ECR_REPO/pulseplus-backend:latest
docker push $ECR_REPO/pulseplus-backend:latest

# Build and push database
echo "Building and pushing database..."
docker build -t pulseplus-db:latest -f ./backend/Dockerfile.db ./backend
docker tag pulseplus-db:latest $ECR_REPO/pulseplus-db:latest
docker push $ECR_REPO/pulseplus-db:latest

echo "All images have been built and pushed to ECR successfully!"