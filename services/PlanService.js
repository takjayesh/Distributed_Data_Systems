class PlanService {
    createPlan(createRequest) { }
    updatePlan(objectId, updateRequest) { }
    deletePlan(objectId) { }
    getPlan(objectId, requestETag) { }
    hasKey(key) {
        throw new Error("hasKey method must be implemented");
    }

}
module.exports = PlanService;
