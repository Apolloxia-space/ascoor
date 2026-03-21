
# syntax=docker/dockerfile:1.6

FROM node:24-alpine AS base

RUN apk add --no-cache bash libc6-compat openssl

WORKDIR /app

FROM base AS dev

RUN apk add --no-cache git

WORKDIR /app

CMD ["npm", "run", "dev"]

FROM base AS deps

WORKDIR /app/web
COPY web/package.json ./package.json
COPY web/package-lock.json ./package-lock.json
RUN npm ci

FROM base AS builder

WORKDIR /app/web
COPY --from=deps /app/web/node_modules ./node_modules
COPY web/. .
ARG APP_ENV
RUN if [ -z "$APP_ENV" ]; then echo "APP_ENV is required (development|production)"; exit 1; fi
RUN if [ ! -f ".env.${APP_ENV}" ]; then echo ".env.${APP_ENV} is required"; exit 1; fi
RUN cp ".env.${APP_ENV}" .env
# Ensure only the selected env file is used during next build.
RUN rm -f .env.local .env.development .env.development.local .env.production .env.production.local
RUN npm run build

FROM base AS production

WORKDIR /app

COPY --from=builder /app/web/.next/standalone ./
# Next.js standalone output is nested under the app directory name (web) in a monorepo.
# Ensure static assets and public files are placed alongside the server entrypoint.
COPY --from=builder /app/web/public ./web/public
COPY --from=builder /app/web/.next/static ./web/.next/static

USER node

EXPOSE 3000

# スタンドアロン出力はビルドディレクトリ名 (web) 配下に配置される
WORKDIR /app/web

CMD ["node", "server.js"]
