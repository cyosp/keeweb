FROM alpine:3.11.3

MAINTAINER CYOSP <cyosp@cyosp.com>

RUN apk upgrade \
    && apk add \
        nginx \
        bash

RUN echo "daemon off;" >> /etc/nginx/nginx.conf
RUN sed -i 's|access_log.*|access_log /dev/stdout;|g' /etc/nginx/nginx.conf;
RUN sed -i 's|error_log.*|error_log /dev/stdout info;|g' /etc/nginx/nginx.conf;

RUN rm -rf /etc/nginx/conf.d/*
ADD package/docker/nginx.conf /etc/nginx/conf.d/keeweb.conf

RUN mkdir -p /run/nginx /keeweb/www /keeweb/data

COPY dist /keeweb/www

ADD package/docker/entrypoint.sh  /usr/local/bin
RUN chmod a+x /usr/local/bin/entrypoint.sh

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["nginx"]

EXPOSE 80
