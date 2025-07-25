# Use official Node image for build
FROM node:18 AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY . .
RUN npm run build

# Use nginx to serve static files
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY ngnix.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
