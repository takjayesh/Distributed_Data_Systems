const redisClient = require('../configuration/redisConfig');
const PlanDao = require('./PlanDao');
const PlanNotFoundException = require('../exceptions/PlanNotFoundException');

class PlanDaoImpl extends PlanDao {
  async save(key, value) {
    await redisClient.set(key, value);
  }

  async update(key, value) {
    const exists = await this.hasKey(key);
    if (!exists) {
      throw new PlanNotFoundException();
    }
    await redisClient.set(key, value);
  }

  async delete(key) {
    const response = await redisClient.del(key);
    console.log("deletion response", response);
    if (!response) {
      throw new PlanNotFoundException();
    }
  }

  async find(key) {
    const reply = await redisClient.get(key);
    if (!reply) {
      throw new PlanNotFoundException();
    }
    return reply;
  }

  async hasKey(key) {
    const reply = await redisClient.exists(key);
    return reply === 1;
  }
}

module.exports = PlanDaoImpl;
