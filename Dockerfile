FROM node:16 as builder

WORKDIR /src

COPY . .

# Setup build env
ARG A_MEDIA
ENV MEDIA=$A_MEDIA
ARG A_API
ENV API=$A_API
ARG A_GOOGLEKEY
ENV GOOGLEKEY=$A_GOOGLEKEY
ARG A_REALTIME
ENV REALTIME=$A_REALTIME
ARG A_COMMIT
ENV COMMIT=$A_COMMIT
RUN printenv

RUN yarn install \
  --prefer-offline \
  --frozen-lockfile \
  --non-interactive \
  --production=true

ENV NODE_ENV=production
RUN yarn build

RUN rm -rf node_modules && \
  NODE_ENV=production yarn install \
  --prefer-offline \
  --pure-lockfile \
  --non-interactive \
  --production=true

FROM node:16-alpine

WORKDIR /src

COPY --from=builder /src  .

# Setup run env
ARG A_MEDIA
ENV MEDIA=$A_MEDIA
ARG A_API
ENV API=$A_API
ARG A_GOOGLEKEY
ENV GOOGLEKEY=$A_GOOGLEKEY
ARG A_REALTIME
ENV REALTIME=$A_REALTIME
ARG A_COMMIT
ENV COMMIT=$A_COMMIT
RUN printenv

ENV NODE_ENV=production
ENV HOST 0.0.0.0
EXPOSE 3000

CMD [ "yarn", "nuxt", "start" ]