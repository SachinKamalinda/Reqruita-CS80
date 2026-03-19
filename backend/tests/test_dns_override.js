const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI;
console.log('Testing connection with DNS override...');

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('SUCCESS: Connected to MongoDB with DNS override!');
    process.exit(0);
  })
  .catch(err => {
    console.error('FAILED even with DNS override:', err.message);
    process.exit(1);
  });
