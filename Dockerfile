FROM node:14-alpine AS builder

ENV NODE_WORKDIR /app
WORKDIR $NODE_WORKDIR

ADD . $NODE_WORKDIR

RUN yarn install --prod

FROM mhart/alpine-node:slim-14

ENV NODE_WORKDIR /app
WORKDIR $NODE_WORKDIR

COPY --from=builder $NODE_WORKDIR/ ./

CMD node index.js