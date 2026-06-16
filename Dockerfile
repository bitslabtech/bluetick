# ─────────────────────────────────────────────────────────────────────────────
# Stage 1: Build React frontend
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS frontend-builder

WORKDIR /app/client

# Install dependencies first (cached layer)
COPY client/package*.json ./
RUN npm ci --prefer-offline

# Copy source and build
COPY client/ ./

# VITE_API_URL must be set as an environment variable in Railway
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2: Production server
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Install only production server dependencies
COPY server/package*.json ./
RUN npm ci --omit=dev --prefer-offline

# Copy server source
COPY server/ ./

# Copy built frontend dist into server so Express can serve it
COPY --from=frontend-builder /app/client/dist ./public/dist

# Create writable directories that the app needs at runtime
RUN mkdir -p uploads logs public/uploads plugins

# Expose port (Railway injects $PORT at runtime, default 5000)
EXPOSE 5000

# Start the server
CMD ["node", "index.js"]
