FROM node:22-bookworm

WORKDIR /app

# 패키지 매니저 및 의존성 캐시 복사
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches

# pnpm 설치 및 의존성 설치
RUN corepack enable && pnpm install --frozen-lockfile

# 소스 복사 및 프로덕션 빌드
COPY . .
ARG VITE_AUTH_MODE=local
ENV VITE_AUTH_MODE=${VITE_AUTH_MODE}
RUN pnpm run build

# 환경 변수 및 포트
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# 실행 명령어
CMD ["sh", "-c", "pnpm drizzle-kit migrate || true; node dist/index.js"]
