FROM node:22-bookworm
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-pip openjdk-21-jdk-headless build-essential git curl ca-certificates golang-go rustc cargo && rm -rf /var/lib/apt/lists/*
RUN corepack enable && useradd --uid 1000 --create-home --shell /bin/bash coder
USER coder
WORKDIR /workspace
