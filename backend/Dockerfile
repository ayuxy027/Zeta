FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build && npm prune --omit=dev

EXPOSE 3001
CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/server.js"]
