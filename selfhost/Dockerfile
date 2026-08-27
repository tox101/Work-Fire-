FROM node:22-bookworm

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches
RUN corepack enable && pnpm install --frozen-lockfile

COPY . .
ARG VITE_AUTH_MODE=local
ENV VITE_AUTH_MODE=${VITE_AUTH_MODE}
RUN pnpm run build

ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "dist/index.js"]
