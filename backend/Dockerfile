FROM node:20-alpine

WORKDIR /usr/src/app

COPY . .

WORKDIR /usr/src/app/core
RUN npm install
RUN npm run build

WORKDIR /usr/src/app/backend
RUN npm install
RUN npm run build

CMD ["npm", "run", "dev"]

