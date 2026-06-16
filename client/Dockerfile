# ─────────────────────────────────────────────────────────────────────────────
# Bluetick — Client Dockerfile
# Used by Coolify for the frontend/static service
# Build context: ./client
# ─────────────────────────────────────────────────────────────────────────────

# Stage 1: Build the React app
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --prefer-offline && npm cache clean --force

COPY . .

# VITE_API_URL is passed as a build argument from Coolify environment variables
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# Stage 2: Serve with nginx (tiny, battle-tested static server)
FROM nginx:alpine AS production

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy our custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built React app
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
