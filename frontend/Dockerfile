# CloudAudit — Frontend container image (React Router 7 + Vite, SSR via react-router-serve).
# VITE_API_URL must be passed at docker build so the client bundle calls the correct API origin.
# SSR — pass API URL at build: docker build --build-arg VITE_API_URL=http://YOUR_IP:3000/api
FROM node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat

ARG VITE_API_URL=http://localhost:3000/api
ENV VITE_API_URL=${VITE_API_URL}

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 cloudaudit

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/build ./build

USER cloudaudit
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["npm", "run", "start"]
