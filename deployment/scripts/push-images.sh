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
docker build --no-cache -t pulseplus-frontend:latest -f deployment/docker/Dockerfile.frontend .
docker tag pulseplus-frontend:latest $ECR_REPO/pulseplus-frontend:latest
docker push $ECR_REPO/pulseplus-frontend:latest

# Build and push backend
echo "Building and pushing backend..."
docker build --no-cache -t pulseplus-backend:latest -f deployment/docker/Dockerfile.backend .
docker tag pulseplus-backend:latest $ECR_REPO/pulseplus-backend:latest
docker push $ECR_REPO/pulseplus-backend:latest

# Build and push documentation
echo "Building and pushing documentation..."
docker build --no-cache -t pulseplus-docs:latest -f deployment/docker/Dockerfile.docs .
docker tag pulseplus-docs:latest $ECR_REPO/pulseplus-docs:latest
docker push $ECR_REPO/pulseplus-docs:latest

# Build and push database
echo "Building and pushing database..."
docker build --no-cache -t pulseplus-db:latest -f deployment/docker/Dockerfile.db .
docker tag pulseplus-db:latest $ECR_REPO/pulseplus-db:latest
docker push $ECR_REPO/pulseplus-db:latest

# Build and push nginx
echo "Building and pushing nginx..."
docker build --no-cache -t pulseplus-nginx:latest -f deployment/docker/Dockerfile.nginx .
docker tag pulseplus-nginx:latest $ECR_REPO/pulseplus-nginx:latest
docker push $ECR_REPO/pulseplus-nginx:latest

echo "All images have been built and pushed to ECR successfully!"