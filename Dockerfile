FROM node:20-slim

# Instalacja Chromium, xvfb, cron i zależności
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

# Ustaw katalog roboczy
WORKDIR /app

# Skopiuj pliki Node.js i zainstaluj zależności
COPY package*.json ./
RUN npm install

# Skopiuj pozostałe pliki projektu
COPY . .

# Upewnij się, że logi istnieją
RUN mkdir -p /app/logs && touch /app/logs/cron.log

# Dodaj zadanie cron (musi kończyć się pustą linią)
RUN echo "0 15 * * * root bash /app/run.sh >> /app/logs/cron.log 2>&1" > /etc/cron.d/puppeteer-cron && \
    echo "" >> /etc/cron.d/puppeteer-cron && \
    chmod 0644 /etc/cron.d/puppeteer-cron

# (Opcjonalnie) Dodaj testowe zadanie na każdą minutę – do debugowania
RUN echo "* * * * * root echo 'cron działa: $(date)' >> /app/logs/cron.log" >> /etc/cron.d/puppeteer-cron

# Uruchom crona w trybie pierwszoplanowym
CMD ["cron", "-f"]