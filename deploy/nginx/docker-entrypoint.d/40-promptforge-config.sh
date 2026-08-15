#!/bin/sh
set -eu

if [ -s /etc/nginx/certs/fullchain.pem ] && [ -s /etc/nginx/certs/privkey.pem ]; then
  cp /etc/nginx/promptforge-https.conf /etc/nginx/conf.d/default.conf
else
  cp /etc/nginx/promptforge-http.conf /etc/nginx/conf.d/default.conf
fi
