function createState(initial = {}) {
  const store = { ...initial };

  return {
    get(key, defaultValue = undefined) {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : defaultValue;
    },
    set(key, value) {
      store[key] = value;
      return store[key];
    },
    snapshot() {
      return { ...store };
    },
  };
}

module.exports = {
  createState,
};
