# Docker Support for Nodemailer MCP Server 🐳

This document covers how to build, run, and deploy the Nodemailer MCP Server using Docker.

## Quick Start

### 1. Build the Docker Image

```bash
# Build the image
docker build -t mcp-nodemailer .

# Or use the npm script
npm run docker:build
```

### 2. Run with Environment Variables

```bash
# AWS SES SMTP
docker run --rm \
  -e SMTP_HOST="email-smtp.us-east-1.amazonaws.com" \
  -e SMTP_PORT="587" \
  -e SMTP_USER="AKIA256X4BH57AV2ZCHM" \
  -e SMTP_PASS="BEByPtg3+uQU3QVdUvpy7EZKlidtPTYenNWYcFcP3s4o" \
  -e DEBUG="true" \
  mcp-nodemailer

# Gmail
docker run --rm \
  -e EMAIL_SERVICE="gmail" \
  -e GMAIL_USER="your-email@gmail.com" \
  -e GMAIL_PASS="your-app-password" \
  -e DEBUG="true" \
  mcp-nodemailer
```

### 3. Run with Environment File

```bash
# Create .env file
cp env.example .env
# Edit .env with your credentials

# Run with env file
docker run --rm --env-file .env mcp-nodemailer
```

## Docker Compose

### Available Profiles

The `docker-compose.yml` includes several profiles for different configurations:

#### SES SMTP Profile
```bash
# Set environment variables
export SES_SMTP_USER="AKIA256X4BH57AV2ZCHM"
export SES_SMTP_PASS="BEByPtg3+uQU3QVdUvpy7EZKlidtPTYenNWYcFcP3s4o"
export SES_SENDER_EMAIL="verified@your-domain.com"

# Run SES SMTP configuration
docker-compose --profile ses-smtp up
```

#### Gmail Profile
```bash
# Set environment variables
export GMAIL_USER="your-email@gmail.com"
export GMAIL_PASS="your-app-password"

# Run Gmail configuration
docker-compose --profile gmail up
```

#### Test Profile (Ethereal Email)
```bash
# Run with test account (no configuration needed)
docker-compose --profile test up
```

#### Custom SMTP Profile
```bash
# Set environment variables
export SMTP_HOST="smtp.example.com"
export SMTP_USER="username"
export SMTP_PASS="password"
export SENDER_EMAIL_ADDRESS="sender@example.com"

# Run custom SMTP configuration
docker-compose --profile custom up
```

## Environment Variables

### SMTP Configuration
```bash
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=AKIA256X4BH57AV2ZCHM
SMTP_PASS=BEByPtg3+uQU3QVdUvpy7EZKlidtPTYenNWYcFcP3s4o
```

### Gmail Configuration
```bash
EMAIL_SERVICE=gmail
GMAIL_USER=your-email@gmail.com
GMAIL_PASS=your-app-password
```

### AWS SES API Configuration
```bash
EMAIL_SERVICE=ses
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
```

### General Configuration
```bash
SENDER_EMAIL_ADDRESS=default@example.com
REPLY_TO_EMAIL_ADDRESSES=reply1@example.com,reply2@example.com
DEBUG=true
SMTP_POOL=true
SMTP_MAX_CONNECTIONS=5
SMTP_MAX_MESSAGES=100
```

## Production Deployment

### Docker Swarm

```yaml
# docker-stack.yml
version: '3.8'

services:
  mcp-nodemailer:
    image: mcp-nodemailer:latest
    environment:
      - SMTP_HOST=email-smtp.us-east-1.amazonaws.com
      - SMTP_PORT=587
      - SMTP_USER_FILE=/run/secrets/smtp_user
      - SMTP_PASS_FILE=/run/secrets/smtp_pass
      - SMTP_POOL=true
      - SMTP_MAX_CONNECTIONS=10
    secrets:
      - smtp_user
      - smtp_pass
    deploy:
      replicas: 2
      restart_policy:
        condition: on-failure

secrets:
  smtp_user:
    external: true
  smtp_pass:
    external: true
```

Deploy:
```bash
# Create secrets
echo "AKIA256X4BH57AV2ZCHM" | docker secret create smtp_user -
echo "BEByPtg3+uQU3QVdUvpy7EZKlidtPTYenNWYcFcP3s4o" | docker secret create smtp_pass -

# Deploy stack
docker stack deploy -c docker-stack.yml mcp-email
```

### Kubernetes

```yaml
# k8s-deployment.yml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mcp-nodemailer
spec:
  replicas: 2
  selector:
    matchLabels:
      app: mcp-nodemailer
  template:
    metadata:
      labels:
        app: mcp-nodemailer
    spec:
      containers:
      - name: mcp-nodemailer
        image: mcp-nodemailer:latest
        env:
        - name: SMTP_HOST
          value: "email-smtp.us-east-1.amazonaws.com"
        - name: SMTP_PORT
          value: "587"
        - name: SMTP_USER
          valueFrom:
            secretKeyRef:
              name: smtp-credentials
              key: username
        - name: SMTP_PASS
          valueFrom:
            secretKeyRef:
              name: smtp-credentials
              key: password
        - name: SMTP_POOL
          value: "true"
        resources:
          requests:
            memory: "64Mi"
            cpu: "50m"
          limits:
            memory: "128Mi"
            cpu: "100m"
---
apiVersion: v1
kind: Secret
metadata:
  name: smtp-credentials
type: Opaque
data:
  username: QUtJQTI1Nlg0Qkg1N0FWMlpDSE0=  # base64 encoded
  password: QkVCeVB0ZzMrdVFVM1FWZFV2cHk3RVpLbGlkdFBUWWVuTldZY0ZjUDNzNG8=  # base64 encoded
```

Deploy:
```bash
kubectl apply -f k8s-deployment.yml
```

## Multi-Stage Build (Optimized)

For production, you can use a multi-stage build to reduce image size:

```dockerfile
# Dockerfile.optimized
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine AS production

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY --from=builder /app/build ./build

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodemailer -u 1001 && \
    chown -R nodemailer:nodejs /app

USER nodemailer

CMD ["node", "build/index.js"]
```

Build optimized image:
```bash
docker build -f Dockerfile.optimized -t mcp-nodemailer:optimized .
```

## Health Checks

The Docker image includes a health check. You can also add custom health checks:

```bash
# Check if container is healthy
docker ps --filter "name=mcp-nodemailer" --format "table {{.Names}}\t{{.Status}}"

# View health check logs
docker inspect mcp-nodemailer --format='{{json .State.Health}}'
```

## Troubleshooting

### Common Issues

#### Container Exits Immediately
```bash
# Check logs
docker logs mcp-nodemailer

# Run interactively for debugging
docker run -it --rm mcp-nodemailer sh
```

#### SMTP Connection Issues
```bash
# Test with debug mode
docker run --rm \
  -e SMTP_HOST="email-smtp.us-east-1.amazonaws.com" \
  -e SMTP_USER="AKIA256X4BH57AV2ZCHM" \
  -e SMTP_PASS="BEByPtg3+uQU3QVdUvpy7EZKlidtPTYenNWYcFcP3s4o" \
  -e DEBUG="true" \
  mcp-nodemailer

# Check network connectivity
docker run --rm mcp-nodemailer sh -c "nslookup email-smtp.us-east-1.amazonaws.com"
```

#### Permission Issues
```bash
# Check if running as non-root user
docker run --rm mcp-nodemailer id

# Should output: uid=1001(nodemailer) gid=1001(nodejs)
```

### Performance Tuning

#### Memory Limits
```bash
# Run with memory limit
docker run --rm -m 128m \
  -e SMTP_HOST="email-smtp.us-east-1.amazonaws.com" \
  -e SMTP_USER="AKIA256X4BH57AV2ZCHM" \
  -e SMTP_PASS="BEByPtg3+uQU3QVdUvpy7EZKlidtPTYenNWYcFcP3s4o" \
  mcp-nodemailer
```

#### Connection Pooling
```bash
# Enable connection pooling for better performance
docker run --rm \
  -e SMTP_HOST="email-smtp.us-east-1.amazonaws.com" \
  -e SMTP_USER="AKIA256X4BH57AV2ZCHM" \
  -e SMTP_PASS="BEByPtg3+uQU3QVdUvpy7EZKlidtPTYenNWYcFcP3s4o" \
  -e SMTP_POOL="true" \
  -e SMTP_MAX_CONNECTIONS="10" \
  -e SMTP_MAX_MESSAGES="1000" \
  mcp-nodemailer
```

## Security Best Practices

1. **Use Secrets**: Never put credentials in Dockerfiles or images
2. **Non-Root User**: The image runs as a non-root user by default
3. **Read-Only Filesystem**: Consider using `--read-only` flag
4. **Network Isolation**: Use custom networks in production
5. **Resource Limits**: Always set memory and CPU limits

```bash
# Secure run example
docker run --rm \
  --read-only \
  --tmpfs /tmp \
  -m 128m \
  --cpus="0.5" \
  --env-file .env \
  mcp-nodemailer
```

## Integration with MCP Clients

### Cursor Configuration

```json
{
  "mcpServers": {
    "nodemailer": {
      "type": "command",
      "command": "docker",
      "args": [
        "run", "--rm", "--env-file", "/path/to/.env",
        "mcp-nodemailer"
      ]
    }
  }
}
```

### Claude Desktop Configuration

```json
{
  "mcpServers": {
    "nodemailer": {
      "command": "docker",
      "args": [
        "run", "--rm",
        "-e", "SMTP_HOST=email-smtp.us-east-1.amazonaws.com",
        "-e", "SMTP_USER=AKIA256X4BH57AV2ZCHM",
        "-e", "SMTP_PASS=BEByPtg3+uQU3QVdUvpy7EZKlidtPTYenNWYcFcP3s4o",
        "mcp-nodemailer"
      ]
    }
  }
}
``` 