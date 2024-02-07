const PlanNotFoundException = require('./PlanNotFoundException');
const PlanNotUpdatedException = require('./PlanNotUpdatedException');

module.exports = (err, req, res, next) => {
    // Check if the error is a ECONNREFUSED error
    if (err.code === 'ECONNREFUSED') {
        return res.status(503).json({ error: 'Service unavailable.' });
    }

    // Handle specific errors first
    if (err instanceof PlanNotFoundException) {
        res.status(404).json({ error: `Plan not found in database` });
    } else if (err instanceof PlanNotUpdatedException) {
        res.status(304).send(); // No Content
    } else if (err instanceof Error) {
        res.status(500).send({ error: err.message });
    }
};
