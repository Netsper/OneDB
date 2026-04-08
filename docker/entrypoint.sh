#!/bin/sh

# Navigate to frontend and handle node tasks
cd /var/www/html/frontend

if [ ! -f "node_modules/.bin/vite" ]; then
    echo "Dependencies missing. Installing (this may take a minute)..."
    npm install
fi

if [ "$APP_ENV" = "dev" ]; then
    echo "Starting Vite Dev Server..."
    # Run vite directly to skip predev (format/lint) which often fails in restricted docker envs
    ./node_modules/.bin/vite --host 0.0.0.0 &
else
    echo "Starting in PRODUCTION mode..."
    # Build frontend assets
    npm run build
fi

# Start PHP-FPM in background
php-fpm -D

# Start Nginx in foreground
echo "Starting Nginx..."
nginx -g "daemon off;"
