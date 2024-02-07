class PlanNotUpdatedException extends Error {
    constructor(objectId) {
        super(`Plan with Object ID: ${objectId} not updated`);
        this.name = this.constructor.name;
        this.objectId = objectId;
        Error.captureStackTrace(this, this.constructor);
    }

    getObjectId() {
        return this.objectId;
    }
}

module.exports = PlanNotUpdatedException;
