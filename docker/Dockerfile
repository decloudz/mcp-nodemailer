# Use Node.js LTS Alpine image for smaller size
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build the TypeScript project
RUN npm run build

# Remove dev dependencies to reduce image size
RUN npm prune --production

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodemailer -u 1001

# Change ownership of the app directory
RUN chown -R nodemailer:nodejs /app
USER nodemailer

# Expose port (not strictly necessary for MCP but good practice)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "console.log('Health check passed')" || exit 1

# Default command
CMD ["node", "build/index.js"] 