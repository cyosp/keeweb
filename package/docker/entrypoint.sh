#!/bin/bash

if [ ${KEEWEB_CONFIG_URL} ]
then
    sed -i "s|(no-config)|${KEEWEB_CONFIG_URL}|" /keeweb/index.html
fi

echo "$WEBDAV_AUTH_BASIC_CONFIG" > /etc/nginx/.webdav.passwords

echo "Start: $@"
exec "$@"
