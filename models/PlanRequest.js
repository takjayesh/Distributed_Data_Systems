class PlanRequest {
    constructor(planCostShares, linkedPlanServices, _org, objectId, objectType, planType, creationDate) {
        this.planCostShares = planCostShares;
        this.linkedPlanServices = linkedPlanServices;
        this._org = _org;
        this.objectId = objectId;
        this.objectType = objectType;
        this.planType = planType;
        this.creationDate = creationDate;
    }
}
