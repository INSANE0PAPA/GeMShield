FROM node:20-slim AS build

WORKDIR /app

COPY package.json bun.lock ./
# Use npm since Docker image has node, not bun
RUN npm install --legacy-peer-deps

COPY . .
RUN npm run build

FROM node:20-slim AS runtime

WORKDIR /app
COPY --from=build /app/.output /app/.output

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
