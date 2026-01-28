# KGC Web Dockerfile - Vite + React PWA Application
# Epic 33-4: Full Stack Docker Setup
# Multi-stage build for optimized production image

# ===========================================
# Stage 1: Build Dependencies
# ===========================================
FROM node:20-alpine AS deps

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy package files for dependency installation
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig.base.json ./
COPY apps/kgc-web/package.json ./apps/kgc-web/

# Copy shared packages that kgc-web depends on
COPY packages/shared/ui/package.json ./packages/shared/ui/

# Install dependencies
RUN pnpm install --frozen-lockfile

# ===========================================
# Stage 2: Build Application
# ===========================================
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY --from=deps /app/apps ./apps

# Copy source code
COPY . .

# Build arguments for environment variables baked into the build
ARG VITE_API_URL=http://localhost:3000
ARG VITE_APP_NAME=KGC_ERP
ARG VITE_APP_VERSION=7.0.0

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_APP_NAME=$VITE_APP_NAME
ENV VITE_APP_VERSION=$VITE_APP_VERSION

# Build the application
RUN pnpm --filter kgc-web build

# ===========================================
# Stage 3: Production Image (Nginx)
# ===========================================
FROM nginx:alpine AS runner

# Copy custom nginx config
COPY apps/kgc-web/nginx.conf /etc/nginx/nginx.conf

# Copy built assets from builder stage
COPY --from=builder /app/apps/kgc-web/dist /usr/share/nginx/html

# Add non-root user for security
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

# Switch to non-root user
USER nginx

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
