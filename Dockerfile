# syntax=docker/dockerfile:1

FROM oven/bun:1 AS builder
WORKDIR /app

ARG PUBLIC_SITE_URL=http://localhost:8080
ENV PUBLIC_SITE_URL=${PUBLIC_SITE_URL}

RUN apt-get update && \
    apt-get install -y --no-install-recommends git ca-certificates && \
    rm -rf /var/lib/apt/lists/*

COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

COPY . .

# Match the GitHub publish workflow: fetch content from the repository's
# main branch and replace the current working branch content before building.
RUN git fetch --depth=1 origin main && \
    mkdir -p /tmp/vault && \
    git archive FETCH_HEAD content | tar -x -C /tmp/vault && \
    rm -rf src/data/posts src/data/reviews src/data/assets && \
    mkdir -p src/data && \
    cp -R /tmp/vault/content/posts src/data/posts && \
    cp -R /tmp/vault/content/reviews src/data/reviews && \
    cp -R /tmp/vault/content/assets src/data/assets

RUN bun run build

FROM nginx:1.27-alpine AS runtime
COPY --from=builder /app/dist /usr/share/nginx/html
COPY <<'EOF' /etc/nginx/conf.d/default.conf
server {
  listen 8080;
  server_name localhost;

  root /usr/share/nginx/html;
  index index.html;

  location / {
    try_files $uri $uri/ =404;
  }
}
EOF
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
