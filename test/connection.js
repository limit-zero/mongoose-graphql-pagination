const connection = require('./mongoose');
const mongoose = require('mongoose');
const Model = require('./mongoose/model');
const elasticsearch = require('./elasticsearch');

const indexes = new Promise((resolve, reject) => {
  Model.on('index', (err) => {
    if (err) {
      reject(err)
    } else {
      resolve();
    }
  });
});

const connect = () => Promise.all([
  new Promise((resolve, reject) => {
    connection.on('connected', resolve);
    connection.on('error', reject);
  }),
  elasticsearch.connect(),
]);

const disconnect = () => Promise.all([
  new Promise((resolve, reject) => {
    connection.on('disconnected', resolve);
    mongoose.disconnect((err) => {
      if (err) reject(err);
    });
  }),
  elasticsearch.disconnect(),
]);

before(async function() {
  console.info('Initializing connections to MongoDB and Elasticsearch...');
  this.timeout(30000);
  await connect();
  console.info('Connections established.');
});

after(async function() {
  await indexes;
  await disconnect();
});
