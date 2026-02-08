# ==============================================================================
# Multi-stage Dockerfile for Cabin Reservation App
# Stage 1: Install deps + build frontend
# Stage 2: Lean production image
# ==============================================================================

# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-slim AS builder

# sharp & bcrypt need native build tools + OpenSSL for Prisma
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files first (better Docker cache)
COPY package.json package-lock.json ./

# Install ALL dependencies (including devDependencies for vite build)
RUN npm ci

# Copy prisma schema + config for generate step
COPY prisma/ prisma/
COPY prisma.config.ts ./

# Set dummy DATABASE_URL for prisma generate (Prisma 7 config loads this even at generate time)
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"

# Generate Prisma client (requires DATABASE_URL env var even for code generation)
RUN npx prisma generate

# Copy the rest of source code
COPY tsconfig.json vite.config.ts ./
COPY src/ src/

# Build frontend (Vite → dist/frontend/)
RUN npm run build

# ── Stage 2: Production ──────────────────────────────────────────────────────
FROM node:20-slim AS production

# sharp needs libvips at runtime, bcrypt needs libc
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy prisma schema + config (needed for migrate deploy at startup)
COPY prisma/ prisma/
COPY prisma.config.ts ./

# Copy generated Prisma client from builder
COPY --from=builder /app/src/generated/ src/generated/

# Copy built frontend from builder
COPY --from=builder /app/dist/frontend/ dist/frontend/

# Copy backend source (runs via tsx at runtime)
COPY tsconfig.json ./
COPY src/backend/ src/backend/
COPY src/config/ src/config/
COPY src/middleware/ src/middleware/
COPY src/utils/ src/utils/
COPY src/types.ts src/types.ts
COPY src/validators/ src/validators/

# Create data directories
RUN mkdir -p data/uploads/thumbs data/logs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "fetch('http://localhost:3000/api/health').then(r=>{if(!r.ok)throw new Error();process.exit(0)}).catch(()=>process.exit(1))"

# Environment defaults
ENV NODE_ENV=production
ENV PORT=3000

# Start: run migrations then start server
CMD ["sh", "-c", "npx prisma migrate deploy && node --import tsx src/backend/server.new.ts"]
