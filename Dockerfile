# Multi-stage build for SCIM Client
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage with nginx
FROM nginx:alpine

# Install Python and requests library using system package manager
RUN apk add --no-cache python3 py3-requests curl

# Copy built application
COPY --from=builder /app/dist /var/www

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy CORS proxy script
COPY simple-cors-proxy.py /usr/local/bin/simple-cors-proxy.py
RUN chmod +x /usr/local/bin/simple-cors-proxy.py

# Create nginx temp directories
RUN mkdir -p /var/cache/nginx /var/run

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

# Start script
COPY start.sh /start.sh
RUN chmod +x /start.sh

# Start the services
CMD ["/start.sh"] 