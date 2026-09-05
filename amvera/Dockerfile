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
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
