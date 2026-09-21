# syntax=docker/dockerfile:1
FROM node:22-slim

WORKDIR /app

# Install dependencies first for better layer caching.
COPY backend/package.json backend/package-lock.json ./backend/
RUN cd backend && npm ci --omit=dev

# Copy application source (static frontends + backend).
COPY backend ./backend
COPY public ./public
COPY admin ./admin

ENV NODE_ENV=production
ENV PORT=5000

# SQLite database and uploads. Mount a persistent volume here —
# otherwise data is lost on container restart/redeploy.
VOLUME /app/backend/data
VOLUME /app/backend/uploads

EXPOSE 5000
WORKDIR /app/backend
CMD ["node", "src/server.js"]