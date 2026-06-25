# ── Backend Stage ──────────────────────────────────────────
FROM python:3.12-slim AS backend

WORKDIR /app

# System deps for Playwright
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget gnupg2 libglib2.0-0 libnss3 libnspr4 libdbus-1-3 \
    libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 \
    libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 \
    libpango-1.0-0 libcairo2 libasound2t64 libatspi2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY backend/pyproject.toml backend/__init__.py /app/
COPY backend/ /app/

RUN pip install --no-cache-dir -e ".[dev]"

# Install Playwright Chromium
RUN playwright install chromium --with-deps

# ── Frontend Stage ─────────────────────────────────────────
FROM node:18-slim AS frontend

WORKDIR /app

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ .

RUN npm run build

# ── Final Stage ────────────────────────────────────────────
FROM python:3.12-slim AS production

WORKDIR /app

# System deps for Playwright
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget gnupg2 libglib2.0-0 libnss3 libnspr4 libdbus-1-3 \
    libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 \
    libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 \
    libpango-1.0-0 libcairo2 libasound2t64 libatspi2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy backend
COPY backend/pyproject.toml backend/__init__.py /app/backend/
COPY backend/ /app/backend/
RUN pip install --no-cache-dir -e "/app/backend[dev]"

# Copy Playwright browsers from backend stage
COPY --from=backend /root/.cache/ms-playwright /root/.cache/ms-playwright

# Copy frontend build
COPY --from=frontend /app/.next /app/frontend/.next
COPY --from=frontend /app/node_modules /app/frontend/node_modules
COPY --from=frontend /app/package.json /app/frontend/
COPY --from=frontend /app/next.config.ts /app/frontend/
COPY --from=frontend /app/public /app/frontend/public

EXPOSE 4006 3006

COPY docker-entrypoint.sh /app/
RUN chmod +x /app/docker-entrypoint.sh

ENTRYPOINT ["/app/docker-entrypoint.sh"]
