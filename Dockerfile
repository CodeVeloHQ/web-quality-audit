FROM node:22-bookworm-slim

RUN apt-get update \
    && apt-get install --yes --no-install-recommends chromium \
    && rm -rf /var/lib/apt/lists/*

ENV CHROME_PATH=/usr/bin/chromium
WORKDIR /audit

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src
ENTRYPOINT ["node", "/audit/src/cli.js"]

