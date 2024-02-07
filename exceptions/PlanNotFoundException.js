class PlanNotFoundException extends Error {
    constructor(message) {
        super(message || "Plan not found");
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = PlanNotFoundException;
