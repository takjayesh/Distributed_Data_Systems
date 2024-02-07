// Loading environment variables from .env file
require('dotenv').config();

const { Client } = require('@elastic/elasticsearch');

const ElasticURL = process.env.ELASTIC_SEARCH_URL;

const client = new Client({
    node: ElasticURL
});

const INDEX_NAME = process.env.ELASTIC_INDEX_NAME;

async function createIndexWithMappings() {
    const exists = await client.indices.exists({ index: INDEX_NAME });
    if (!exists) {
        await client.indices.create({
            index: INDEX_NAME,
            body: {
                settings: {
                    // Add any specific settings here if needed
                },
                mappings: {
                    properties: {
                        _org: { type: "text" },
                        objectId: { type: "keyword" },
                        objectType: { type: "text" },
                        planType: { type: "text" },
                        creationDate: { type: "date", format: "MM-dd-yyyy" },
                        planCostShares: {
                            properties: {
                                deductible: { type: "long" },
                                copay: { type: "long" },
                                _org: { type: "text" },
                                objectId: { type: "keyword" },
                                objectType: { type: "text" }
                            }
                        },
                        linkedPlanServices: {
                            properties: {
                                _org: { type: "text" },
                                objectId: { type: "keyword" },
                                objectType: { type: "text" },
                                linkedService: {
                                    properties: {
                                        _org: { type: "text" },
                                        name: { type: "text" },
                                        objectId: { type: "keyword" },
                                        objectType: { type: "text" }
                                    }
                                },
                                planserviceCostShares: {
                                    properties: {
                                        deductible: { type: "long" },
                                        copay: { type: "long" },
                                        _org: { type: "text" },
                                        objectId: { type: "keyword" },
                                        objectType: { type: "text" }
                                    }
                                }
                            }
                        },
                        plan_join: {
                            type: "join",
                            eager_global_ordinals: true,
                            relations: {
                                "plan": ["planCostShares", "linkedPlanServices"],
                                "linkedPlanServices": ["linkedService", "planserviceCostShares"]
                            }
                        }
                    }
                }
            }
        });
    }
}


// Recursive function to process each object and its nested objects/arrays
function processObject(obj, parentId, objectType) {
    let documents = [];
    let document = { ...obj };

    if (parentId) {
        document.plan_join = { name: objectType, parent: parentId };
    } else {
        document.plan_join = { name: 'plan' };
    }

    documents.push({ id: obj.objectId, body: document });

    for (const [key, value] of Object.entries(obj)) {
        if (Array.isArray(value)) {
            value.forEach(item => {
                if (typeof item === 'object') {
                    documents = documents.concat(processObject(item, obj.objectId, key));
                }
            });
        } else if (typeof value === 'object' && value !== null) {
            documents = documents.concat(processObject(value, obj.objectId, key));
        }
    }

    return documents;
}

// Function to index a document
async function indexDocument(document) {
    try {
        await createIndexWithMappings();
        const documents = processObject(document, null, 'plan');

        for (const doc of documents) {
            await client.index({
                index: INDEX_NAME,
                id: doc.id,
                body: doc.body,
                routing: doc.body.plan_join.parent || doc.id,
                refresh: true // Immediate refresh for immediate availability
            });
        }
    }
    catch (error) {
        console.error('Error indexing document:', error);
    }
}

async function deleteDocument(documentId) {
    try {
        await client.delete({
            index: INDEX_NAME,
            id: documentId,
            refresh: true // Immediate refresh
        });
    } catch (error) {
        console.error(`Error deleting document with ID ${documentId}:`, error);
    }
}

async function receiveMessage(message) {
    const { operation, body } = message;
    switch (operation) {
        case 'SAVE':
            await indexDocument(JSON.parse(body));
            break;
        case 'DELETE':
            await deleteDocument(JSON.parse(body).objectId);
            break;
    }
}

module.exports = {
    receiveMessage
};