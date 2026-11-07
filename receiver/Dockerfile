FROM node:22-bookworm-slim
WORKDIR /srv
COPY server.mjs .
ENV HOST=0.0.0.0
ENV PORT=8090
EXPOSE 8090
CMD ["node", "server.mjs"]
