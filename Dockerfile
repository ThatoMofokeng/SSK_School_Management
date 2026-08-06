# ---- deps: install dependencies only ----
FROM node:20-slim AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# ---- build: compile the Next.js app ----
FROM node:20-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# ---- runtime: minimal production image ----
FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system app && adduser --system --ingroup app app

COPY --from=build /app/public ./public
COPY --from=build /app/.next ./.next
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package*.json ./
COPY --from=build /app/prisma ./prisma

USER app
EXPOSE 3000

# Run pending migrations against whatever DATABASE_URL the container is
# actually started with, at container start — NOT baked into the image
# at build time (the original ran `prisma migrate dev` during `docker build`,
# which is an interactive/dev command and ties the image to one database).
CMD npx prisma migrate deploy && npm start
