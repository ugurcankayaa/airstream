FROM node:20-alpine AS build
WORKDIR /app

COPY . .
RUN npm ci

ARG UI_API_BASE_URL

ENV VITE_UI_API_BASE_URL=$UI_API_BASE_URL

RUN npm run build -w ui

FROM nginx:1.27-alpine
COPY --from=build /app/ui/dist /usr/share/nginx/html
COPY ui/nginx.template.conf /etc/nginx/templates/default.conf.template
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]