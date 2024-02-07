// Loading environment variables from .env file
require('dotenv').config();

const amqp = require('amqplib');

const topicExchangeName = process.env.TOPIC_EXCHANGE_NAME
const queueName = process.env.QUEUE_NAME
let channel;

async function connectRabbitMQ() {
    const connection = await amqp.connect(process.env.AMQP_URL);
    channel = await connection.createChannel();
    await channel.assertQueue(queueName, { durable: false });
    await channel.assertExchange(topicExchangeName, 'topic', { durable: false });
    await channel.bindQueue(queueName, topicExchangeName, queueName);
}

async function publishMessage(message) {
    if (!channel) {
        await connectRabbitMQ();
    }
    channel.sendToQueue(queueName, Buffer.from(JSON.stringify(message)));
}

module.exports = publishMessage;
