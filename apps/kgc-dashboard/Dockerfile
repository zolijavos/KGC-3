# ==============================================================================
# MyForgeOS Dashboard - Production Dockerfile
# Static React app served by nginx
# ==============================================================================

FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/kgc-dashboard/package.json ./apps/kgc-dashboard/

# Install dependencies
RUN pnpm install --frozen-lockfile --filter @kgc/dashboard

# Copy source
COPY apps/kgc-dashboard ./apps/kgc-dashboard

# Build
WORKDIR /app/apps/kgc-dashboard
RUN pnpm build

# ==============================================================================
# Production stage - nginx
# ==============================================================================
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/apps/kgc-dashboard/dist /usr/share/nginx/html

# nginx config for SPA routing
RUN echo 'server { \
    listen 80; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    location /health { \
        return 200 "OK"; \
        add_header Content-Type text/plain; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
