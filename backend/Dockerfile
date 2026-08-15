FROM node:24-bookworm-slim AS base

ARG NPM_REGISTRY=https://registry.npmmirror.com
ENV PNPM_HOME=/pnpm
ENV PATH=${PNPM_HOME}:${PATH}
ENV NPM_CONFIG_REGISTRY=${NPM_REGISTRY}

RUN corepack enable \
  && corepack prepare pnpm@11.1.3 --activate \
  && pnpm config set registry "${NPM_REGISTRY}"
WORKDIR /app

FROM base AS dependencies

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --registry="${NPM_REGISTRY}"

FROM dependencies AS builder

COPY . .
RUN pnpm build

FROM base AS production-dependencies

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --prod --frozen-lockfile --registry="${NPM_REGISTRY}"

FROM node:24-bookworm-slim AS runner

ENV NODE_ENV=production
ENV PORT=7001
ENV HOST=0.0.0.0
WORKDIR /app

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs appuser

COPY --from=production-dependencies --chown=appuser:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:nodejs /app/package.json ./package.json
COPY --from=builder --chown=appuser:nodejs /app/dist ./dist
COPY --from=builder --chown=appuser:nodejs /app/mock ./mock
COPY --from=builder --chown=appuser:nodejs /app/templates ./dist/templates

USER appuser
EXPOSE 7001
CMD ["node", "dist/bin/www.js"]
