FROM node:20-slim

ENV TZ=Europe/Warsaw

RUN apt-get update && apt-get install -y \
  chromium \
  xvfb \
  xauth \
  cron \
  php-cli \
  curl \
  tzdata \
  nano \
  libx11-xcb1 libxcomposite1 libxcursor1 libxdamage1 libxi6 \
  libxtst6 libnss3 libxrandr2 libasound2 libpangocairo-1.0-0 \
  libatk-bridge2.0-0 libgtk-3-0 libdrm2 libgbm1 \
  --no-install-recommends && \
  ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && \
  echo $TZ > /etc/timezone && \
  apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN mkdir -p /app/logs && touch /app/logs/cron.log

RUN echo "0 15 * * * root bash /app/run.sh >> /app/logs/cron.log 2>&1" > /etc/cron.d/puppeteer-cron && \
    echo "" >> /etc/cron.d/puppeteer-cron && \
    chmod 0644 /etc/cron.d/puppeteer-cron

CMD ["cron", "-f"]
