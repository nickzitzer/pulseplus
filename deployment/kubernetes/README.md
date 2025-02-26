# PulsePlus Kubernetes Deployment

This directory contains Kubernetes configuration files for deploying the PulsePlus application.

## Prerequisites

- Kubernetes cluster (v1.19+)
- kubectl configured to communicate with your cluster
- Container registry with your application images

## Components

The deployment consists of the following components:

- **Frontend**: Next.js web application
- **Backend**: Node.js API server
- **PostgreSQL**: Database server
- **Redis**: Cache and session store

## Configuration

### Secrets

Before deploying, you need to create a `secrets.yaml` file based on the provided `secrets-template.yaml`:

```bash
cp secrets-template.yaml secrets.yaml
```

Edit `secrets.yaml` to include your actual secrets. **Never commit this file to version control.**

### ConfigMap

Review and modify the `configmap.yaml` file to adjust application configuration as needed.

## Deployment

Use the provided `deploy.sh` script to deploy the application:

```bash
# Basic deployment with default settings
./deploy.sh

# Deploy to a specific namespace
./deploy.sh --namespace pulseplus

# Deploy specific images
./deploy.sh --backend-image registry.example.com/pulseplus-backend:v1.0.0 --frontend-image registry.example.com/pulseplus-frontend:v1.0.0

# Apply secrets during deployment (use with caution)
./deploy.sh --apply-secrets
```

## Accessing the Application

Once deployed, the application will be available at the hostname specified in the Ingress configuration.

By default, this is `pulseplus.example.com`. You'll need to:

1. Configure DNS to point this domain to your Kubernetes cluster's ingress controller
2. Configure TLS certificates (the deployment uses cert-manager)

## Scaling

You can scale the application components using kubectl:

```bash
# Scale the backend to 4 replicas
kubectl scale deployment pulseplus-backend --replicas=4 -n <namespace>

# Scale the frontend to 3 replicas
kubectl scale deployment pulseplus-frontend --replicas=3 -n <namespace>
```

## Monitoring

The backend service exposes Prometheus metrics at the `/metrics` endpoint.

## Troubleshooting

### Checking Logs

```bash
# Backend logs
kubectl logs -l app=pulseplus,tier=backend -n <namespace>

# Frontend logs
kubectl logs -l app=pulseplus,tier=frontend -n <namespace>

# Database logs
kubectl logs -l app=pulseplus,tier=database -n <namespace>

# Redis logs
kubectl logs -l app=pulseplus,tier=cache -n <namespace>
```

### Checking Pod Status

```bash
kubectl get pods -l app=pulseplus -n <namespace>
```

### Checking Service Status

```bash
kubectl get services -l app=pulseplus -n <namespace>
```

## Maintenance

### Database Backups

The PostgreSQL deployment should be configured with regular backups. Consider using a solution like Velero for Kubernetes-native backups or a PostgreSQL-specific backup solution.

### Updating the Application

To update the application, build and push new container images, then update the deployments:

```bash
# Update backend
./deploy.sh --backend-image registry.example.com/pulseplus-backend:v1.0.1

# Update frontend
./deploy.sh --frontend-image registry.example.com/pulseplus-frontend:v1.0.1

# Update both
./deploy.sh --backend-image registry.example.com/pulseplus-backend:v1.0.1 --frontend-image registry.example.com/pulseplus-frontend:v1.0.1
``` 