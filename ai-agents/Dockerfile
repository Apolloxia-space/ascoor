# syntax=docker/dockerfile:1.6

FROM node:24-alpine AS base

RUN apk add --no-cache bash libc6-compat

WORKDIR /app

FROM base AS dev

RUN apk add --no-cache git

WORKDIR /app

CMD ["npm", "run", "dev"]

FROM base AS deps

COPY ai-agents/package.json ./package.json
COPY ai-agents/package-lock.json ./package-lock.json
RUN npm ci

FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules
COPY ai-agents/. ./
RUN npm run build

FROM node:24-alpine AS production

RUN apk add --no-cache bash libc6-compat \
  && addgroup -g 1001 -S nodejs \
  && adduser -S nodejs -u 1001

ENV NODE_ENV=production

WORKDIR /app

COPY ai-agents/package.json ./package.json
COPY ai-agents/package-lock.json ./package-lock.json
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

USER nodejs

CMD ["node", "dist/index.js"]
