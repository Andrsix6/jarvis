FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --chown=node:node server.js jarvis.html ./
USER node
EXPOSE 4173
CMD ["node", "server.js"]
