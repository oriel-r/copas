FROM node:24-slim

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY tsconfig.json ./
COPY src ./src
COPY config ./config

RUN mkdir -p /app/data

EXPOSE 8080

CMD ["node", "--experimental-strip-types", "src/index.ts"]
