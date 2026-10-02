# Frontend: build do Vite servido por nginx (com proxy de /api para a API). Contexto: raiz do monorepo.
FROM node:22-bookworm-slim AS build
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/config/package.json packages/config/
COPY packages/contracts/package.json packages/contracts/
COPY packages/disc-core/package.json packages/disc-core/
COPY backend/package.json backend/
COPY frontend/package.json frontend/
COPY e2e/package.json e2e/
RUN pnpm install --frozen-lockfile --ignore-scripts && pnpm rebuild
COPY packages packages
COPY frontend frontend
# Conta de demonstração opcional (as credenciais ficam públicas no bundle: só para demo local)
ARG VITE_DEMO_EMAIL=""
ARG VITE_DEMO_PASSWORD=""
ENV VITE_DEMO_EMAIL=$VITE_DEMO_EMAIL VITE_DEMO_PASSWORD=$VITE_DEMO_PASSWORD
RUN pnpm --filter @disc/frontend... build

FROM nginx:1.27-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist /usr/share/nginx/html
EXPOSE 80
