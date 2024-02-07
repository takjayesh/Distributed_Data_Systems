// Loading environment variables from .env file
require('dotenv').config();

const Redis = require('ioredis');

// Default configuration values
const REDIS_HOST = process.env.REDIS_HOST;
const REDIS_PORT = process.env.REDIS_PORT;

const client = new Redis({
  host: REDIS_HOST,
  port: REDIS_PORT
});

client.on('connect', () => {
  console.log(`Connected to Redis at ${REDIS_HOST}:${REDIS_PORT}`);
   
  // PING command to further validate the connection
  client.ping((err, res) => {
    if (err) {
      console.error('Error while pinging Redis:', err);
    } else {
      console.log('Ping response:', res); // Should print "PONG"
    }
  });
  
});

client.on('error', (err) => {
  console.error('Redis error:', err);
});

module.exports = client;
