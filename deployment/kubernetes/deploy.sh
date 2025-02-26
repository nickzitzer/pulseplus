#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Default values
NAMESPACE="default"
BACKEND_IMAGE="pulseplus-backend:latest"
FRONTEND_IMAGE="pulseplus-frontend:latest"
APPLY_SECRETS=false
DEPLOY_DB=true
DEPLOY_REDIS=true

# Display help
function show_help {
  echo "Usage: $0 [options]"
  echo ""
  echo "Options:"
  echo "  -n, --namespace NAMESPACE    Kubernetes namespace (default: default)"
  echo "  -b, --backend-image IMAGE    Backend image to deploy (default: pulseplus-backend:latest)"
  echo "  -f, --frontend-image IMAGE   Frontend image to deploy (default: pulseplus-frontend:latest)"
  echo "  -s, --apply-secrets          Apply secrets from secrets.yaml (use with caution)"
  echo "  --skip-db                    Skip deploying the database"
  echo "  --skip-redis                 Skip deploying Redis"
  echo "  -h, --help                   Show this help message"
  exit 0
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  key="$1"
  case $key in
    -n|--namespace)
      NAMESPACE="$2"
      shift
      shift
      ;;
    -b|--backend-image)
      BACKEND_IMAGE="$2"
      shift
      shift
      ;;
    -f|--frontend-image)
      FRONTEND_IMAGE="$2"
      shift
      shift
      ;;
    -s|--apply-secrets)
      APPLY_SECRETS=true
      shift
      ;;
    --skip-db)
      DEPLOY_DB=false
      shift
      ;;
    --skip-redis)
      DEPLOY_REDIS=false
      shift
      ;;
    -h|--help)
      show_help
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      show_help
      ;;
  esac
done

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
  echo -e "${RED}Error: kubectl is not installed or not in PATH${NC}"
  exit 1
fi

# Check if namespace exists, create if it doesn't
if ! kubectl get namespace $NAMESPACE &> /dev/null; then
  echo -e "${YELLOW}Namespace $NAMESPACE does not exist. Creating...${NC}"
  kubectl create namespace $NAMESPACE
fi

# Apply ConfigMap
echo -e "${GREEN}Applying ConfigMap...${NC}"
kubectl apply -f configmap.yaml -n $NAMESPACE

# Apply Secrets if requested
if [ "$APPLY_SECRETS" = true ]; then
  if [ -f "secrets.yaml" ]; then
    echo -e "${YELLOW}Applying Secrets from secrets.yaml...${NC}"
    kubectl apply -f secrets.yaml -n $NAMESPACE
  else
    echo -e "${RED}Error: secrets.yaml not found. Create it from secrets-template.yaml${NC}"
    exit 1
  fi
else
  echo -e "${YELLOW}Skipping Secrets application. Make sure secrets are already applied or use --apply-secrets${NC}"
fi

# Deploy Database if not skipped
if [ "$DEPLOY_DB" = true ]; then
  echo -e "${GREEN}Deploying PostgreSQL...${NC}"
  kubectl apply -f postgres-pvc.yaml -n $NAMESPACE
  kubectl apply -f postgres-deployment.yaml -n $NAMESPACE
  kubectl apply -f postgres-service.yaml -n $NAMESPACE
else
  echo -e "${YELLOW}Skipping PostgreSQL deployment...${NC}"
fi

# Deploy Redis if not skipped
if [ "$DEPLOY_REDIS" = true ]; then
  echo -e "${GREEN}Deploying Redis...${NC}"
  kubectl apply -f redis-pvc.yaml -n $NAMESPACE
  kubectl apply -f redis-deployment.yaml -n $NAMESPACE
  kubectl apply -f redis-service.yaml -n $NAMESPACE
else
  echo -e "${YELLOW}Skipping Redis deployment...${NC}"
fi

# Process and apply backend deployment
echo -e "${GREEN}Applying Backend Deployment...${NC}"
sed "s|\${BACKEND_IMAGE}|$BACKEND_IMAGE|g" backend-deployment.yaml | kubectl apply -f - -n $NAMESPACE

# Process and apply frontend deployment
echo -e "${GREEN}Applying Frontend Deployment...${NC}"
sed "s|\${FRONTEND_IMAGE}|$FRONTEND_IMAGE|g" frontend-deployment.yaml | kubectl apply -f - -n $NAMESPACE

# Apply Services
echo -e "${GREEN}Applying Services...${NC}"
kubectl apply -f backend-service.yaml -n $NAMESPACE
kubectl apply -f frontend-service.yaml -n $NAMESPACE

# Apply Ingress
echo -e "${GREEN}Applying Ingress...${NC}"
kubectl apply -f ingress.yaml -n $NAMESPACE

echo -e "${GREEN}Deployment completed successfully!${NC}"
echo -e "${YELLOW}Checking deployment status...${NC}"

# Wait for deployments to be ready
if [ "$DEPLOY_DB" = true ]; then
  echo -e "${YELLOW}Waiting for PostgreSQL deployment...${NC}"
  kubectl rollout status deployment/pulseplus-postgres -n $NAMESPACE
fi

if [ "$DEPLOY_REDIS" = true ]; then
  echo -e "${YELLOW}Waiting for Redis deployment...${NC}"
  kubectl rollout status deployment/pulseplus-redis -n $NAMESPACE
fi

echo -e "${YELLOW}Waiting for Backend deployment...${NC}"
kubectl rollout status deployment/pulseplus-backend -n $NAMESPACE

echo -e "${YELLOW}Waiting for Frontend deployment...${NC}"
kubectl rollout status deployment/pulseplus-frontend -n $NAMESPACE

echo -e "${GREEN}All deployments are ready!${NC}"
echo -e "Access your application at: https://pulseplus.example.com" 