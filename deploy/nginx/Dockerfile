FROM nginx:1.27-alpine

RUN rm -f /etc/nginx/conf.d/default.conf

COPY http.conf /etc/nginx/promptforge-http.conf
COPY https.conf /etc/nginx/promptforge-https.conf
COPY docker-entrypoint.d/40-promptforge-config.sh /docker-entrypoint.d/40-promptforge-config.sh

RUN chmod +x /docker-entrypoint.d/40-promptforge-config.sh
