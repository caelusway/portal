FROM node:23.3.0-slim AS builder

WORKDIR /app

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    g++ \
    git \
    make \
    python3 \
    unzip && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

RUN npm install -g bun@1.2.5 turbo@2.3.3

RUN ln -s /usr/bin/python3 /usr/bin/python

COPY package.json turbo.json tsconfig.json lerna.json renovate.json .npmrc ./
COPY scripts ./scripts
COPY packages ./packages

# Build-time environment variables (passed from Railway)
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_SUPABASE_SERVICE_KEY
ARG VITE_SUPABASE_JWT_SECRET
ARG VITE_PRIVY_APP_ID
ARG VITE_POSTHOG_KEY
ARG VITE_POSTHOG_HOST
ARG DISCORD_BOT_TOKEN
ARG VITE_NFT_MINTER_PRIVATE_KEY


ENV VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
ENV VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}
ENV VITE_SUPABASE_SERVICE_KEY=${VITE_SUPABASE_SERVICE_KEY}
ENV VITE_SUPABASE_JWT_SECRET=${VITE_SUPABASE_JWT_SECRET}
ENV VITE_PRIVY_APP_ID=${VITE_PRIVY_APP_ID}
ENV VITE_POSTHOG_KEY=${VITE_POSTHOG_KEY}
ENV VITE_POSTHOG_HOST=${VITE_POSTHOG_HOST}
ENV DISCORD_BOT_TOKEN=${DISCORD_BOT_TOKEN}
ENV VITE_NFT_MINTER_PRIVATE_KEY=${VITE_NFT_MINTER_PRIVATE_KEY}

RUN bun install --no-cache

RUN bun run build

FROM node:23.3.0-slim

WORKDIR /app

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    curl \
    git \
    python3 \
    unzip && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

RUN npm install -g bun@1.2.5 turbo@2.3.3

COPY --from=builder /app/package.json ./
COPY --from=builder /app/turbo.json ./
COPY --from=builder /app/tsconfig.json ./
COPY --from=builder /app/lerna.json ./
COPY --from=builder /app/renovate.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/scripts ./scripts

ENV NODE_ENV=production
ENV TRACKING_BOT_CLIENT_ID=${TRACKING_BOT_CLIENT_ID}
ENV OPENAI_API_KEY=${OPENAI_API_KEY}
ENV RESEND_API_KEY=${RESEND_API_KEY}
ENV SERVER_PORT=${SERVER_PORT}


EXPOSE 3000

CMD ["bun", "run", "start"]
