# API image. Build from the repository root (npm workspaces share one lockfile):
#   docker build -f apps/api/Dockerfile -t lily-api .
# Targets: `runtime` (default, the API) and `migrate` (one-shot job applying
# the on-disk migrations, which needs the Prisma CLI, a dev dependency).

FROM node:24-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci -w apps/api

FROM deps AS build
COPY apps/api apps/api
RUN npm run build -w apps/api

FROM build AS migrate
WORKDIR /app/apps/api
CMD ["npx", "prisma", "db", "migrate"]

FROM node:24-slim AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci -w apps/api --omit=dev

FROM node:24-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=prod-deps /app ./
COPY --from=build /app/apps/api/dist apps/api/dist
WORKDIR /app/apps/api
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=3 \
  CMD ["node", "-e", "fetch('http://localhost:3000/api/health').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]
CMD ["node", "dist/main.js"]
