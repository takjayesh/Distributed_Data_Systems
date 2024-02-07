// Loading environment variables from .env file
require('dotenv').config();

const { Client } = require('@elastic/elasticsearch');

const ElasticURL = process.env.ELASTIC_SEARCH_URL;

const client = new Client({
  node: ElasticURL // Elasticsearch instance URL
});

async function checkElasticsearch() {
  try {
    const health = await client.cluster.health({});
    console.log(health);
  } catch (error) {
    console.error('Error connecting to Elasticsearch:', error);
  }
}

module.exports = checkElasticsearch;
