# --- build ------------------------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /repo
RUN apk add --no-cache openssl

COPY package.json package-lock.json* ./
COPY packages/game-core/package.json packages/game-core/
COPY apps/api/package.json apps/api/
RUN npm install --workspace @hub/api --include-workspace-root

COPY apps/api apps/api
RUN npm run build --workspace @hub/api

# --- runtime ----------------------------------------------------------------
FROM node:22-alpine AS runtime
WORKDIR /repo
RUN apk add --no-cache openssl
ENV NODE_ENV=production

COPY --from=build /repo/node_modules node_modules
COPY --from=build /repo/package.json package.json
COPY --from=build /repo/apps/api/package.json apps/api/package.json
COPY --from=build /repo/apps/api/dist apps/api/dist
COPY --from=build /repo/apps/api/prisma apps/api/prisma

WORKDIR /repo/apps/api
USER node
CMD ["npm", "run", "start"]
