class PlanDao {
  save(key, value) {
    throw new Error("save method must be implemented");
  }
  update(key, value) {
    throw new Error("update method must be implemented")
  }

  delete(key) {
    throw new Error("delete method must be implemented");
  }

  find(key) {
    throw new Error("find method must be implemented");
  }

  hasKey(key) {
    throw new Error("exists method must be implemented");
  }
}

module.exports = PlanDao;
