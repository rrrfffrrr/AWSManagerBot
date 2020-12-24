# base image
FROM node:alpine
WORKDIR /usr/src/app

ENV NODE_ENV=debug
ENV AWS_ACCESS_KEY_ID='SET YOUR AWS ACCESS KEY ID HERE'
ENV AWS_SECRET_ACCESS_KEY='SET YOUR AWS SECRET ACCESS KEY HERE'
ENV DISCORD_TOKEN='SET YOUR DISCORD BOT TOKEN HERE'
ENV SERVER_OWNER_DISCORD_ID='SET YOUR DISCORD ID HERE'
ENV DB_PATH='/usr/src/app/database'
ENV LOGGER_LEVEL=verbose

ENV TZ='Asia/Seoul'

# install python3 to install npm package\
RUN apk add --no-cache build-base python

# install packages
COPY package*.json ./
RUN npm install --production=false

# copy sources
COPY . .

# build
RUN npm run build

# uninstall dev/build packages
RUN npm prune --production
RUN apk del build-base python

# image setting
CMD [ "npm", "start" ]