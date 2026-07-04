FROM node:22-alpine AS build
WORKDIR /app
COPY viewer/package.json viewer/package-lock.json ./
RUN npm ci
COPY viewer/ .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY --from=build /app/package.json /app/package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY viewer/server ./server
COPY viewer/viewer.config.yaml ./viewer.config.yaml
COPY docs/ ./docs/

USER node
EXPOSE 3100
ENV PORT=3100
ENV DOCS_DIR=./docs
CMD ["npx", "tsx", "server/index.ts"]
