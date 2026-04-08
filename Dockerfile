FROM php:7.4-fpm-alpine

# Install system dependencies
RUN apk add --no-cache \
    nginx \
    nodejs \
    npm \
    libpq-dev \
    libxml2-dev \
    oniguruma-dev \
    sqlite-dev \
    linux-headers

# Install PHP extensions
RUN docker-php-ext-install pdo_mysql pdo_pgsql pdo_sqlite mbstring xml bcmath

# Configure Nginx
COPY ./docker/nginx.conf /etc/nginx/http.d/default.conf

# Set working directory
WORKDIR /var/www/html

# Copy entrypoint script
COPY ./docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Expose ports
EXPOSE 80 5173

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
