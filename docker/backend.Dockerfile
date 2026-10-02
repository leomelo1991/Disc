# Imagem do backend (API + migrations/seed). Contexto: raiz do monorepo.
FROM node:22-bookworm-slim
# openssl: exigido pelo CLI do Prisma (migrate)
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/* && corepack enable
WORKDIR /app

# Dependências primeiro (cache): só os manifestos
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/config/package.json packages/config/
COPY packages/contracts/package.json packages/contracts/
COPY packages/disc-core/package.json packages/disc-core/
COPY backend/package.json backend/
COPY frontend/package.json frontend/
COPY e2e/package.json e2e/
# --ignore-scripts: o hook do Husky (prepare) não faz sentido no container; os scripts que importam
# (prisma, esbuild, swc) estão liberados em pnpm-workspace.yaml e rodam no rebuild abaixo.
RUN pnpm install --frozen-lockfile --ignore-scripts && pnpm rebuild

COPY tsconfig.depcruise.json ./
COPY packages packages
COPY backend backend
RUN pnpm --filter @disc/backend... build

ENV NODE_ENV=development PORT=3000
EXPOSE 3000
CMD ["pnpm", "--filter", "@disc/backend", "start"]
