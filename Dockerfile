# Multi-stage build for SCIM Client
# Stage 1: Build stage with Node.js
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (production only, exclude dev dependencies like Playwright)
RUN npm ci --only=production

# Copy source files
COPY . .

# Stage 2: Production stage with nginx and Python
FROM nginx:alpine AS production

# Install Python and required packages
RUN apk add --no-cache python3 py3-pip curl

# Copy requirements file and install Python dependencies
COPY requirements.txt /tmp/requirements.txt
RUN pip3 install --no-cache-dir --break-system-packages -r /tmp/requirements.txt

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built files from builder stage
COPY --from=builder /app /usr/share/nginx/html

# Copy Python CORS proxy script
COPY simple-cors-proxy.py /usr/local/bin/

# Create startup script
RUN echo '#!/bin/sh' > /usr/local/bin/start.sh && \
    echo 'echo "Starting CORS proxy..."' >> /usr/local/bin/start.sh && \
    echo 'python3 /usr/local/bin/simple-cors-proxy.py &' >> /usr/local/bin/start.sh && \
    echo 'sleep 3' >> /usr/local/bin/start.sh && \
    echo 'echo "Starting nginx..."' >> /usr/local/bin/start.sh && \
    echo 'nginx -g "daemon off;"' >> /usr/local/bin/start.sh && \
    chmod +x /usr/local/bin/start.sh

# Set proper permissions for nginx user
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d && \
    chown nginx:nginx /usr/local/bin/simple-cors-proxy.py && \
    chown nginx:nginx /usr/local/bin/start.sh

# Create necessary directories with proper permissions
RUN mkdir -p /run/nginx && chown nginx:nginx /run/nginx

# Expose port
EXPOSE 80

# Health check with longer start period and more robust checking
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=5 \
    CMD curl -f http://localhost:80/health || exit 1

# Default command
CMD ["/usr/local/bin/start.sh"] 