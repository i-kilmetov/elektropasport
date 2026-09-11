# Production Next.js on Amvera — clone public GitHub main (not stale Code tree).
FROM node:22-alpine AS builder
RUN apk add --no-cache libc6-compat git
WORKDIR /app
ARG REPO_URL=https://github.com/i-kilmetov/elektropasport.git
ARG REPO_REF=main
RUN git clone --depth 1 --branch "${REPO_REF}" "${REPO_URL}" .
ENV NEXT_TELEMETRY_DISABLED=1
# npm ci must run with NODE_ENV unset so build tooling (e.g. @tailwindcss/postcss) installs.
RUN npm ci
ENV NODE_ENV=production
# NEXT_PUBLIC_* must be present in Amvera Variables during build.
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
# Bind address only — never use this value in public redirects (see resolveRequestOrigin).
ENV HOSTNAME=0.0.0.0
# node:sqlite is still experimental on Node 22.
ENV NODE_OPTIONS=--experimental-sqlite
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Reform GKH indexes + nationwide GIS ЖКХ passport index.
COPY --from=builder --chown=nextjs:nodejs /app/data/reform-gkh/index ./data/reform-gkh/index
COPY --from=builder --chown=nextjs:nodejs /app/data/gis-gkh/index ./data/gis-gkh/index
# Prefer uncompressed SQLite at runtime (extract once in the image).
USER root
RUN if [ -f ./data/gis-gkh/index/mkd.min.sqlite.gz ] && [ ! -f ./data/gis-gkh/index/mkd.min.sqlite ]; then \
      gzip -dk ./data/gis-gkh/index/mkd.min.sqlite.gz; \
    fi \
 && chown -R nextjs:nodejs ./data
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
