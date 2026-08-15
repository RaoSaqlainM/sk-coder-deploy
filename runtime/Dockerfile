FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-pip python3-numpy openjdk-21-jdk-headless build-essential git curl ca-certificates golang-go rustc cargo php-cli ruby-full kotlin && rm -rf /var/lib/apt/lists/*
RUN corepack enable && npm install -g typescript tsx && useradd --uid 1000 --create-home --shell /bin/bash coder
USER coder
WORKDIR /workspace
