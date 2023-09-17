FROM node:lts-buster
EXPOSE 9999
COPY . /app/
WORKDIR /app
RUN npm install
CMD npm run build && npm run preview
