# ─────────────────────────────────────────────────────────────────────────────
# Bluetick — Server Dockerfile
# Used by Coolify for the API/backend service
# Build context: ./server
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine

# Install dumb-init for proper signal handling in Docker
RUN apk add --no-cache dumb-init

WORKDIR /app

# Install dependencies (production only for smaller image)
COPY package*.json ./
RUN npm ci --omit=dev --prefer-offline && npm cache clean --force

# Copy server source
COPY . .

# Create writable runtime directories
RUN mkdir -p logs public/uploads plugins

# Expose port (Coolify injects $PORT at runtime, default 5000)
EXPOSE 5000

# Use dumb-init as PID 1 for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "index.js"]
