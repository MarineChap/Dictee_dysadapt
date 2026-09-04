# Static build of Dictadapt, served by nginx.
#
# The app has no server side: this image is a bundle plus a file server, and
# exists so the DysAdapt stack can serve Dictadapt next to the main app under
# /dictee (see dysadapt/docker-compose.yml). Nothing here reaches the network
# at runtime — the Tesseract model, the fonts and the voices all ship inside.

FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Vite bakes the base path into the bundle — asset URLs, the PWA manifest's
# start_url/scope and the service worker's navigate fallback all inline it — so
# it must be a build arg. Setting it on the running container is too late.
# `/` suits the standalone and Capacitor bundles; DysAdapt passes `/dictee/`.
ARG VITE_BASE=/
ENV VITE_BASE=$VITE_BASE
RUN npm run build


FROM nginx:alpine AS runner

# The nginx entrypoint renders templates/ through envsubst into conf.d/ at
# container start, so the listen port is changeable without a rebuild. The
# filter keeps envsubst off everything but our own vars — without it, any
# environment variable that happens to share a name with something in the
# config would be substituted too.
#
# The template MUST stay named default.conf.template: it renders to
# conf.d/default.conf and so replaces the stock server block that the base image
# ships, which listens on 80. Rename it and nginx serves both — and binds 80,
# which collides with the reverse proxy under `network_mode: host`.
ENV DICTEE_PORT=8081
ENV NGINX_ENVSUBST_FILTER=^DICTEE_

COPY docker/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 8081
