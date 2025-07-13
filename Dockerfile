FROM node:20-slim

# Instalacja Chromium, PHP CLI, xvfb, cron
RUN apt-get update && apt-get install -y \
  chromium \
  xvfb \
  xauth \
  cron \
  php-cli \
  curl \
  libx11-xcb1 libxcomposite1 libxcursor1 libxdamage1 libxi6 \
  libxtst6 libnss3 libxrandr2 libasound2 libpangocairo-1.0-0 \
  libatk-bridge2.0-0 libgtk-3-0 libdrm2 libgbm1 \
  --no-install-recommends && \
  apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Skopiuj pliki Node.js
COPY package*.json ./
RUN npm install

# Skopiuj pozostałe pliki (bez `downloads/`)
COPY . .

# Dodaj zadanie cron: codziennie o 15:00
RUN echo "0 15 * * * root xvfb-run -a bash /app/run.sh >> /app/logs/cron.log 2>&1" > /etc/cron.d/puppeteer-cron && \
    chmod 0644 /etc/cron.d/puppeteer-cron && \
    crontab /etc/cron.d/puppeteer-cron

# Upewnij się, że logi istnieją
RUN mkdir -p /app/logs && touch /app/logs/cron.log

CMD ["cron", "-f"]