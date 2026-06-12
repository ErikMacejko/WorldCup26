# Build the React app, then serve the static files with nginx.
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
# If set, the built app calls the API at this URL instead of the relative
# /api path proxied by nginx (used when client and server are deployed as
# separate services, e.g. on Railway).
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:alpine
# Default for local/docker-compose use; platforms like Railway override this
# with their own injected PORT, and the nginx entrypoint's envsubst picks it
# up via nginx.conf.template -> /etc/nginx/conf.d/default.conf.
ENV PORT=80
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
