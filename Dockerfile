# Multi-stage build for SCIM Client
# Stage 1: Build stage with Node.js
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source files
COPY . .

# Install Playwright browsers for testing
RUN npx playwright install --with-deps

# Stage 2: Production stage with nginx and Python
FROM nginx:alpine AS production

# Install Python and required packages
RUN apk add --no-cache \
    python3 \
    py3-pip \
    curl \
    && pip3 install --no-cache-dir requests==2.32.4

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built files from builder stage
COPY --from=builder /app /usr/share/nginx/html

# Copy Python CORS proxy script
COPY simple-cors-proxy.py /usr/local/bin/

# Create startup script
RUN echo '#!/bin/sh' > /usr/local/bin/start.sh && \
    echo 'python3 /usr/local/bin/simple-cors-proxy.py &' >> /usr/local/bin/start.sh && \
    echo 'nginx -g "daemon off;"' >> /usr/local/bin/start.sh && \
    chmod +x /usr/local/bin/start.sh

# Create non-root user for security
RUN addgroup -g 1001 -S nginx && \
    adduser -S -D -H -u 1001 -h /var/cache/nginx -s /sbin/nologin -G nginx -g nginx nginx

# Set proper permissions
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d && \
    chown nginx:nginx /usr/local/bin/simple-cors-proxy.py && \
    chown nginx:nginx /usr/local/bin/start.sh

# Switch to non-root user
USER nginx

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:80/health || exit 1

# Default command
CMD ["/usr/local/bin/start.sh"] 