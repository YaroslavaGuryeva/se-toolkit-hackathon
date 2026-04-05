# Multi-stage build for React frontend
FROM node:18-alpine AS build

WORKDIR /app

# Copy package files for better caching
COPY package.json ./
RUN npm install

# Copy source code
COPY . .

# Build the production bundle
RUN npm run build

# Production stage with nginx
FROM nginx:alpine

# Copy built files to nginx serving directory
COPY --from=build /app/build /usr/share/nginx/html

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
