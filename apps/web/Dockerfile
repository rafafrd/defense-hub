# --- build ------------------------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /repo

COPY package.json package-lock.json* ./
COPY packages/game-core/package.json packages/game-core/
COPY apps/web/package.json apps/web/
RUN npm install --workspace @hub/web --include-workspace-root

COPY packages/game-core packages/game-core
COPY apps/web apps/web
RUN npm run build --workspace @hub/web

# --- runtime ----------------------------------------------------------------
FROM nginx:1.27-alpine AS runtime
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
CMD ["nginx", "-g", "daemon off;"]
