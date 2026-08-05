# --- Stage 1: build the frontend ---
FROM node:20-bookworm AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# --- Stage 2: build the backend, including native SWORD compilation ---
FROM node:20-bookworm AS backend-build
# node-sword-interface compiles the SWORD C++ engine from source on
# install, so it needs a full toolchain. This step is the slow part of
# the image build (expect several minutes the first time).
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    cmake \
    pkg-config \
    subversion \
    libcurl4-gnutls-dev \
    zlib1g-dev \
    git \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install --omit=dev
COPY backend/ ./
RUN npx prisma generate

# --- Stage 3: runtime image ---
FROM node:20-bookworm-slim AS runtime
# Runtime still needs libcurl for SWORD's network module fetching
RUN apt-get update && apt-get install -y --no-install-recommends \
    libcurl4-gnutls-dev \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=backend-build /app/backend ./
COPY --from=frontend-build /app/frontend/dist ./public

ENV NODE_ENV=production
ENV PORT=8088
EXPOSE 8088

CMD ["sh", "-c", "npx prisma migrate deploy && node src/index.js"]
