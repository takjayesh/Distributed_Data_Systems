// Loading environment variables from .env file
require('dotenv').config();

const express = require('express');
const PlanServiceImpl = require('../services/PlanServiceImpl');
const MD5EncryptionServiceImpl = require('../services/MD5EncryptionServiceImpl');
const ValidationServiceImpl = require('../services/ValidationServiceImpl');
const PlanNotUpdatedException = require('../exceptions/PlanNotUpdatedException');
const PlanNotFoundException = require('../exceptions/PlanNotFoundException');

const router = express.Router();

const CREATE_REQUEST_SCHEMA = "models/planRequest.schema.json";
const PlanDaoImpl = require('../repository/PlanDaoImpl');

const planDao = new PlanDaoImpl();
const encryptionService = new MD5EncryptionServiceImpl();
const planService = new PlanServiceImpl(planDao, encryptionService);
const validationService = new ValidationServiceImpl();

const { OAuth2Client } = require('google-auth-library');

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

const publishMessage = require('../configuration/rabbitMQPublisher');

// Middleware for authenticating token
async function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ error: 'Authorization header is missing' });

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') return res.status(401).json({ error: 'Token is not in the format "Bearer <token>"' });

    const idTokenString = parts[1];

    console.log('ID Token:', idTokenString); // Log the token to the console

    try {
        await client.verifyIdToken({
            idToken: idTokenString,
            audience: GOOGLE_CLIENT_ID,
        });

        // If verification is successful, proceed to the next middleware
        next();
    } catch (error) {
        console.error('Error verifying ID token:', error);
        return res.status(403).json({ error: 'Invalid token' });
    }
}

router.post('/', authenticateToken, async (req, res, next) => {
    try {
        // Check if request body is empty
        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({ error: 'Request body is empty' });
        }
        const { parsedJson } = validationService.validateJson(JSON.stringify(req.body), CREATE_REQUEST_SCHEMA);
        console.log("Request Json Object:", parsedJson);

        // Check if the key already exists
        if (await planService.hasKey(parsedJson.objectId)) {
            return res.status(409).json({ error: 'Plan already exists' });
        }

        const response = await planService.createPlan(parsedJson);
        const eTag = await encryptionService.encrypt(JSON.stringify(parsedJson));

        // Prepare the message for RabbitMQ
        const rabbitMQMessage = {
            operation: "SAVE",
            body: JSON.stringify(req.body) // assuming req.body contains the plan data
        };

        try {
            // Publish the message to RabbitMQ
            await publishMessage(rabbitMQMessage);
            console.log("Message published to RabbitMQ:", rabbitMQMessage);
        } catch (error) {
            console.error("Error publishing message to RabbitMQ:", error);
            // Handle error appropriately
            if (!res.headersSent) {
                res.status(500).json({ error: 'Error publishing message to RabbitMQ' });
            }
        }

        res.status(201).header("ETag", eTag).json(response);
    } catch (err) {
        console.error("error is", err);

        // Check if this is a validation error
        if (err.message.startsWith("Validation error")) {
            return res.status(400).json({
                error: err.message,
                details: err.details || []
            });
        }
        next(err);
    }
});

router.get('/:id', authenticateToken, async (req, res, next) => {
    console.log(req.params.id);
    const requestETag = req.headers['if-none-match'];
    try {
        const result = await planService.getPlan(req.params.id, requestETag);
        res.status(200).send(result);
    } catch (err) {
        if (err instanceof PlanNotUpdatedException) {
            console.log(err.message);
            res.status(304).end();  // Handle the not modified case
        } else {
            next(err)
        }

    }
});

router.delete('/:id', authenticateToken, async (req, res, next) => {
    try {
        // 'If-Match' header contains the ETag provided by the client
        const ifMatchHeader = req.header('If-Match');
        console.log(ifMatchHeader);

        const planObject = await planService.fetchAndParsePlan(req.params.id);
        // Perform ETag validation
        const isETagNotModified = await planService.validatePlanETag(planObject, ifMatchHeader);

        if (!ifMatchHeader) {
            // eTag not provided
            return res.status(428).json({ error: "ETag not provided" });
        }

        // Compare the ETag generated from the current plan with the ETag provided by the client in the 'If-Match' header
        if (!isETagNotModified) {
            // If they don't match, return a 412 Precondition Failed status, 
            // indicating that the plan has changed since the client last retrieved it
            return res.status(412).json({ error: "ETag doesn't match current plan state" });
        }

        // If the ETags match, proceed to delete the plan
        await planService.deletePlan(req.params.id);
        // Return a 204 No Content status to indicate successful deletion without returning any content

        const deleteMessage = {
            operation: "DELETE",
            body: JSON.stringify({ objectId: req.params.id })
        };

        // Send the message to RabbitMQ
        try {
            await publishMessage(deleteMessage);
            console.log("Published DELETE message to RabbitMQ", deleteMessage);
        } catch (error) {
            console.error("Error publishing DELETE message to RabbitMQ:", error);
            // Handle error
        }

        res.status(204).send();

    } catch (err) {
        // Handle errors based on their type
        if (err instanceof PlanNotFoundException) {
            // If the plan was not found or already deleted, return a 404 Not Found status
            res.status(404).json({ error: "Plan not found or already deleted" });
        } else {
            // For all other errors, delegate to a global error handler
            next(err);
        }
    }
});


router.patch('/:id', authenticateToken, async (req, res, next) => {
    try {
        const ifMatchHeader = req.header('If-Match');
        // If the If-Match header is not provided, respond with 428 Precondition Required
        if (!ifMatchHeader) {
            return res.status(428).json({ error: "If-Match header is required" });
        }
        let objectId = req.params.id;
        // Fetch the current plan
        const currentPlan = await planService.fetchAndParsePlan(objectId);

        // Validate the If-Match header against the current ETag of the plan
        const isETagNotModified = await planService.validatePlanETag(currentPlan, ifMatchHeader);
        if (!isETagNotModified) {
            // If the ETag does not match, the plan has been modified elsewhere
            return res.status(412).json({ error: "ETag does not match the current plan state" });
        }

        // Check if request body is empty
        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({ error: 'Request body is empty' });
        }

        const updatedPlan = planService.updatePlanObject(currentPlan, req.body);

        // Validate the updated plan against the schema
        try {
            const { valid } = validationService.validateJson(JSON.stringify(updatedPlan), CREATE_REQUEST_SCHEMA);
            if (!valid) {
                // If not valid, respond with 400 Bad Request
                return res.status(400).json({ error: "Invalid plan data format" });
            }
        } catch (validationError) {
            // If there's a validation error, assume it's a bad request
            return res.status(400).json({ error: validationError.message, details: validationError.details });
        }

        const { updateRequest } = await planService.updatePlan(objectId, updatedPlan);

        // Generate a new ETag for the updated plan
        const newETag = await encryptionService.encrypt(JSON.stringify(updateRequest));


        // Prepare the message for RabbitMQ for UPDATE operation
        const updateMessage = {
            operation: "SAVE", 
            body: JSON.stringify(updatedPlan)
        };

        // Send the message to RabbitMQ
        try {
            await publishMessage(updateMessage);
            console.log("Published UPDATE message to RabbitMQ", updateMessage);
        } catch (error) {
            console.error("Error publishing UPDATE message to RabbitMQ:", error);
        }

        // Respond with the updated plan and new ETag header
        // res.set('ETag', newETag);
        res.status(200).header('ETag', newETag).json({ message: "Plan updated successfully", updateRequest });

    } catch (err) {
        // Handle errors based on their type
        if (err instanceof PlanNotFoundException) {
            // If the plan was not found or already deleted, return a 404 Not Found status
            res.status(404).json({ error: "Plan not found or already deleted" });
        } else {
            // For all other errors, delegate to a global error handler
            next(err);
        }
    }

})

module.exports = router;

