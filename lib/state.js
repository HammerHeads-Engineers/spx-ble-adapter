function createState(initial = {}) {
  const store = { ...initial };
  const listeners = new Map();
  const ANY_KEY = '*';

  function emit(key, value) {
    const specific = listeners.get(key);
    if (specific) {
      specific.forEach((fn) => {
        try {
          fn(value, key);
        } catch (err) {
          console.error('[STATE] listener error:', err);
        }
      });
    }
    const any = listeners.get(ANY_KEY);
    if (any) {
      any.forEach((fn) => {
        try {
          fn(value, key);
        } catch (err) {
          console.error('[STATE] listener error:', err);
        }
      });
    }
  }

  function addListener(key, fn) {
    const bucket = listeners.get(key) || new Set();
    bucket.add(fn);
    listeners.set(key, bucket);
    return () => {
      const current = listeners.get(key);
      if (current) {
        current.delete(fn);
        if (current.size === 0) listeners.delete(key);
      }
    };
  }

  return {
    get(key, defaultValue = undefined) {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : defaultValue;
    },
    set(key, value) {
      const prev = store[key];
      if (prev !== value) {
        store[key] = value;
        emit(key, value);
      } else if (!Object.prototype.hasOwnProperty.call(store, key)) {
        store[key] = value;
      }
      return store[key];
    },
    setMany(values = {}) {
      Object.entries(values).forEach(([key, value]) => {
        this.set(key, value);
      });
      return { ...store };
    },
    ensureDefaults(defaults = {}) {
      Object.entries(defaults).forEach(([key, value]) => {
        if (!Object.prototype.hasOwnProperty.call(store, key) || store[key] === undefined) {
          this.set(key, value);
        }
      });
      return { ...store };
    },
    clear() {
      Object.keys(store).forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(store, key)) {
          delete store[key];
          emit(key, undefined);
        }
      });
    },
    replace(values = {}) {
      const existingKeys = new Set(Object.keys(store));
      Object.entries(values).forEach(([key, value]) => {
        existingKeys.delete(key);
        this.set(key, value);
      });
      existingKeys.forEach((key) => {
        delete store[key];
        emit(key, undefined);
      });
      return { ...store };
    },
    snapshot() {
      return { ...store };
    },
    onChange(key, fn) {
      return addListener(key, fn);
    },
    onAnyChange(fn) {
      return addListener(ANY_KEY, fn);
    },
  };
}

module.exports = {
  createState,
};
