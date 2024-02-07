const PlanService = require('./PlanService');
const PlanNotUpdatedException = require('../exceptions/PlanNotUpdatedException');
const PlanNotFoundException = require('../exceptions/PlanNotFoundException');

class PlanServiceImpl extends PlanService {
    constructor(planDao, encryptionService) {
        super();
        this.planDao = planDao;
        this.encryptionService = encryptionService;
    }

    async createPlan(createRequest) {
        const objectId = createRequest.objectId;
        await this.planDao.save(objectId, JSON.stringify(createRequest));
        return { createRequest, "objectId": objectId };
    }

    async updatePlan(objectId, updateRequest) {
        // Update the plan object
        await this.planDao.update(objectId, JSON.stringify(updateRequest));
        return { updateRequest, "objectId": objectId };
    }

    async deletePlan(objectId) {
        await this.planDao.delete(objectId);
    }

    async validatePlanETag(planObject, expectedETag) {
        // Generate the ETag for the current state of the plan using MD5 encryption
        // This ETag represents the current state of the plan in the database
        const encryptedData = await this.encryptionService.encrypt(JSON.stringify(planObject));
        console.log("------", encryptedData, expectedETag);
        return encryptedData === expectedETag;
    }

    async fetchAndParsePlan(objectId) {
        const plan = await this.planDao.find(objectId);
        if (!plan) {
            throw new PlanNotFoundException(objectId);
        }
        return JSON.parse(plan);
    }


    async getPlan(objectId, requestETag) {
        console.log(objectId, requestETag);
        const planObject = await this.fetchAndParsePlan(objectId);

        // If requestETag is undefined, skip ETag validation and return the plan
        if (requestETag === undefined) {
            console.log("No ETag provided, returning plan details");
            return planObject;
        }


        const isETagNotModified = await this.validatePlanETag(planObject, requestETag);
        console.log(isETagNotModified);
        if (isETagNotModified) {
            // Handle not modified case
            // Return appropriate response or throw error based on your logic
            // console.log("Error in Etag");
            throw new PlanNotUpdatedException(objectId);
            // 304 Not Modified
        }
        return planObject;
        // return JSON.stringify(planObject); 
        // convert back to string if necessary
    }

    async hasKey(key) {
        return await this.planDao.hasKey(key);
    }

    updatePlanObject(originalPlan, patch) {
      if (typeof originalPlan !== 'object' || originalPlan === null) {
        throw new Error('The plan argument must be an object.');
      }
    
      // Update top-level properties except 'linkedPlanServices'
      Object.keys(patch).forEach(key => {
        if (key !== "linkedPlanServices") {
          originalPlan[key] = patch[key];
        }
      });
    
      // Handle updates or additions to 'linkedPlanServices'
      if (patch.linkedPlanServices) {
        patch.linkedPlanServices.forEach(patchService => {
          const existingServiceIndex = originalPlan.linkedPlanServices.findIndex(
            service => service.objectId === patchService.objectId
          );
          
          // Update existing service
          if (existingServiceIndex > -1) {
            // Perform a deep update to update nested properties
            originalPlan.linkedPlanServices[existingServiceIndex] = {
              ...originalPlan.linkedPlanServices[existingServiceIndex],
              ...patchService,
              linkedService: {
                ...originalPlan.linkedPlanServices[existingServiceIndex].linkedService,
                ...patchService.linkedService
              },
              planserviceCostShares: {
                ...originalPlan.linkedPlanServices[existingServiceIndex].planserviceCostShares,
                ...patchService.planserviceCostShares
              }
            };
          } else {
            // Add new service
            originalPlan.linkedPlanServices.push(patchService);
          }
        });
      }
    
      return originalPlan;
    }
}

module.exports = PlanServiceImpl;
