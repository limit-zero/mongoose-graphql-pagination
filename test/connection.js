const connection = require('./mongoose');
const mongoose = require('mongoose');
const Model = require('./mongoose/model');

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
]);

const disconnect = () => Promise.all([
  new Promise((resolve, reject) => {
    connection.on('disconnected', resolve);
    mongoose.disconnect((err) => {
      if (err) reject(err);
    });
  }),
]);

before(async function() {
  await connect();
});

after(async function() {
  await indexes;
  await disconnect();
});
