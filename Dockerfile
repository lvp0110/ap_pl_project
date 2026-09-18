# Фронт crmakyfon: vite build + Node-прокси (server.js).
#
# Multi-stage: vite собирается с dev-зависимостями, в рантайме остаются
# server.js, dist и prod-зависимости (express + http-proxy-middleware).
# Node 22 — на хосте webtest стоит 18, слишком старый для vite 8.

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

# BASE_PATH=/ — отдаём с корня домена, а не из подпути как на GitHub Pages.
# VITE_API_URL="" — клиент бьёт по относительным путям, server.js проксирует
# их в ConstrTodo, cookies остаются first-party.
ENV BASE_PATH=/
ENV VITE_API_URL=""
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY server.js ./
COPY --from=build /app/dist ./dist

ENV DIST_DIR=/app/dist
EXPOSE 3009
USER node
CMD ["node", "server.js"]
