// Loading environment variables from .env file
require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const redisClient = require('./configuration/redisConfig');
const appController = require('./controllers/appController');
const globalExceptionHandler = require('./exceptions/GlobalExceptionHandler');

const startRabbitMQ = require('./configuration/startRabbitMQ');
const checkElasticsearch = require('./configuration/elasticSearchConfig');


const app = express();
const port = process.env.APP_PORT || 3000;

app.use(bodyParser.json());
app.use('/v1/plan', appController);

app.use(globalExceptionHandler);

app.listen(port, async () => {
    console.log(`Server started on http://localhost:${port}`);
    await checkElasticsearch();
    await startRabbitMQ();
});

module.exports = app;