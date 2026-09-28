# Web image: the built front served by Caddy, which also proxies /api.
# Build from the repository root (npm workspaces share one lockfile):
#   docker build -f apps/web/Dockerfile -t lily-web .

FROM node:24-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci -w apps/web
COPY apps/web apps/web
RUN npm run build -w apps/web

FROM caddy:2-alpine
COPY apps/web/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/apps/web/dist /srv
