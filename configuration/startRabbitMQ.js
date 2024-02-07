// Loading environment variables from .env file
require('dotenv').config();

const amqp = require('amqplib');

// RabbitMQ setup where you consume messages
const indexingListenerService = require('../services/indexingListenerService');

const topicExchangeName = process.env.TOPIC_EXCHANGE_NAME
const queueName = process.env.QUEUE_NAME

async function startRabbitMQ() {
    try {
        const connection = await amqp.connect(process.env.AMQP_URL);
        const channel = await connection.createChannel();

        await channel.assertQueue(queueName, { durable: false });
        await channel.assertExchange(topicExchangeName, 'topic', { durable: false });
        await channel.bindQueue(queueName, topicExchangeName, queueName);

        console.log('RabbitMQ started. Waiting for messages...');
        channel.consume(queueName, (msg) => {
            if (msg !== null) {
                console.log('Message received:', msg.content.toString());
                indexingListenerService.receiveMessage(JSON.parse(msg.content.toString()));
                channel.ack(msg);
            }
        });
    } catch (error) {
        console.error('Error starting RabbitMQ:', error);
    }
}

module.exports = startRabbitMQ;
