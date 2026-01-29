# KGC API Dockerfile - NestJS Application
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
COPY apps/kgc-api/package.json ./apps/kgc-api/

# Copy all package.json files from packages (only existing ones)
# Core packages
COPY packages/core/auth/package.json ./packages/core/auth/
COPY packages/core/tenant/package.json ./packages/core/tenant/
COPY packages/core/audit/package.json ./packages/core/audit/
COPY packages/core/config/package.json ./packages/core/config/
COPY packages/core/common/package.json ./packages/core/common/
COPY packages/core/users/package.json ./packages/core/users/
# Shared packages
COPY packages/shared/ui/package.json ./packages/shared/ui/
COPY packages/shared/inventory/package.json ./packages/shared/inventory/
COPY packages/shared/partner/package.json ./packages/shared/partner/
COPY packages/shared/partners/package.json ./packages/shared/partners/
COPY packages/shared/cikk/package.json ./packages/shared/cikk/
COPY packages/shared/products/package.json ./packages/shared/products/
COPY packages/shared/vehicles/package.json ./packages/shared/vehicles/
COPY packages/shared/feladatlista/package.json ./packages/shared/feladatlista/
COPY packages/shared/reporting/package.json ./packages/shared/reporting/
# Berles packages
COPY packages/berles/rental-core/package.json ./packages/berles/rental-core/
COPY packages/berles/rental-checkout/package.json ./packages/berles/rental-checkout/
COPY packages/berles/rental-contract/package.json ./packages/berles/rental-contract/
COPY packages/berles/bergep/package.json ./packages/berles/bergep/
# Szerviz packages
COPY packages/szerviz/service-worksheet/package.json ./packages/szerviz/service-worksheet/
COPY packages/szerviz/service-warranty/package.json ./packages/szerviz/service-warranty/
COPY packages/szerviz/service-norma/package.json ./packages/szerviz/service-norma/
# Aruhaz packages
COPY packages/aruhaz/arres/package.json ./packages/aruhaz/arres/
COPY packages/aruhaz/eladas/package.json ./packages/aruhaz/eladas/
COPY packages/aruhaz/sales-pos/package.json ./packages/aruhaz/sales-pos/
COPY packages/aruhaz/sales-invoice/package.json ./packages/aruhaz/sales-invoice/
COPY packages/aruhaz/sales-quote/package.json ./packages/aruhaz/sales-quote/
COPY packages/aruhaz/bevetelezes/package.json ./packages/aruhaz/bevetelezes/
COPY packages/aruhaz/leltar/package.json ./packages/aruhaz/leltar/
# Integration packages
COPY packages/integration/nav-online/package.json ./packages/integration/nav-online/
COPY packages/integration/twenty-crm/package.json ./packages/integration/twenty-crm/
COPY packages/integration/chatwoot/package.json ./packages/integration/chatwoot/
COPY packages/integration/horilla-hr/package.json ./packages/integration/horilla-hr/
COPY packages/integration/chat/package.json ./packages/integration/chat/
COPY packages/integration/online-booking/package.json ./packages/integration/online-booking/
COPY packages/integration/bergep-szerviz/package.json ./packages/integration/bergep-szerviz/
COPY packages/integration/koko-ai/package.json ./packages/integration/koko-ai/

# Install all dependencies
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

# Generate Prisma client
RUN pnpm --filter @kgc/api exec prisma generate

# Build packages and API (with dependencies using turbo filter syntax)
RUN pnpm build --filter=@kgc/api...

# ===========================================
# Stage 3: Production Image
# ===========================================
FROM node:20-alpine AS runner

# Install build dependencies for native modules (bcrypt)
RUN apk add --no-cache python3 make g++ openssl

# Add non-root user for security BEFORE copying files
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

WORKDIR /app

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Copy files with correct ownership (MUCH faster than chown -R)
# Using --chown sets ownership during copy, avoiding slow recursive chown
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./
COPY --from=builder --chown=nestjs:nodejs /app/pnpm-lock.yaml ./
COPY --from=builder --chown=nestjs:nodejs /app/pnpm-workspace.yaml ./
COPY --from=builder --chown=nestjs:nodejs /app/tsconfig.base.json ./
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/packages ./packages
COPY --from=builder --chown=nestjs:nodejs /app/apps/kgc-api ./apps/kgc-api

# Rebuild bcrypt native module for Alpine (musl vs glibc)
# Delete the pre-built binary and reinstall with correct musl binary
RUN cd /app/node_modules/.pnpm/bcrypt@5.1.1/node_modules/bcrypt && \
    rm -rf lib/binding/* && \
    npm install --ignore-scripts=false

# Remove build dependencies to reduce image size
RUN apk del python3 make g++

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/v1/health || exit 1

# Start application
CMD ["node", "apps/kgc-api/dist/src/main.js"]
