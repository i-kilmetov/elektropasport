# Production Next.js image for Amvera (tokom.ru).
# Always clone public GitHub `main` so rebuilds are not stuck on a stale Code tree.
FROM node:22-alpine AS source
RUN apk add --no-cache git
WORKDIR /src
ARG GIT_REF=main
RUN git clone --depth 1 --branch "${GIT_REF}" https://github.com/i-kilmetov/elektropasport.git .

FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY --from=source /src/package.json /src/package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY --from=deps /app/node_modules ./node_modules
COPY --from=source /src .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
# NEXT_PUBLIC_* must be present in Amvera Variables during build (inlined into client).
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
# Bind address only — never use this value in public redirects (see resolveRequestOrigin).
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
