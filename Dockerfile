# Stage 1: Install dependencies and build Next.js app
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the Next.js app with standalone output
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 2: Production image with Node.js + Python
FROM node:20-slim AS runner

WORKDIR /app

# Install Python, pip, and bash (needed for spawning scripts)
RUN apt-get update && apt-get install -y --no-install-recommends \
    bash \
    python3 \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/* \
    && ln -s /usr/bin/python3 /usr/bin/python

# Create and activate virtual environment, install Python packages
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir \
    tinker \
    datasets \
    transformers \
    torch

# Set up Node.js environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copy built app from builder stage
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

CMD ["node", "server.js"]
