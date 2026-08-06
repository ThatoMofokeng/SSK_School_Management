# ---- deps: install dependencies only ----
FROM node:20-slim AS deps
WORKDIR /app

# Prisma's engines need libssl to detect the right OpenSSL variant to
# download — without this it silently guesses ("openssl-1.1.x") which can
# mismatch the actual runtime image and break at container start.
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
# `npm ci` runs the `postinstall` script (`prisma generate`), which needs
# the schema file to exist — copy it in before installing, not after.
COPY prisma ./prisma
RUN npm ci

# ---- build: compile the Next.js app ----
FROM node:20-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate

# next build's "Collecting page data" step imports every page module,
# which imports src/lib/prisma.ts and constructs a PrismaClient at module
# scope. That constructor validates DATABASE_URL is present even though no
# query runs yet — so without a value here the build fails with
# "Invalid value undefined for datasource db". This is a placeholder for
# build time only; no connection is actually made. The real DATABASE_URL
# is provided at container runtime (e.g. via `docker run -e` or your
# platform's env config) and overrides it — see the runtime stage below.
ARG DATABASE_URL="postgresql://user:password@localhost:5432/db?schema=public"
ENV DATABASE_URL=$DATABASE_URL

RUN npm run build

# ---- runtime: minimal production image ----
FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Needed at runtime too: `prisma migrate deploy` (run in CMD below) and the
# query engine both need libssl available in this final image, not just
# the build stages.
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

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
