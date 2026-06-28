class SimpleCache {
  constructor() {
    this.cache = new Map();
  }

  /**
   * Set a value in the cache with a Time-To-Live (TTL)
   * @param {string} key - The cache key
   * @param {any} value - The value to store
   * @param {number} ttlSeconds - Time to live in seconds
   */
  set(key, value, ttlSeconds) {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.cache.set(key, { value, expiresAt });
  }

  /**
   * Retrieve a value from the cache. Returns null if missing or expired.
   * @param {string} key - The cache key
   * @returns {any|null} The cached value or null
   */
  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return item.value;
  }

  /**
   * Manually delete an item from the cache
   * @param {string} key - The cache key
   */
  delete(key) {
    this.cache.delete(key);
  }

  /**
   * Clear the entire cache
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Check if a key exists in the cache without removing it.
   * Returns false if the key is missing or expired.
   * @param {string} key - The cache key
   * @returns {boolean} True if the key exists and is not expired
   */
  has(key) {
    const item = this.cache.get(key);
    if (!item) return false;
    if (Date.now() > item.expiresAt) {
      return false;
    }
    return true;
  }

  /**
   * Check if a specific key is expired without retrieving the value.
   * Returns true if the key is expired or missing.
   * @param {string} key - The cache key
   * @returns {boolean} True if the key is expired or missing
   */
  isExpired(key) {
    const item = this.cache.get(key);
    if (!item) return true;
    return Date.now() > item.expiresAt;
  }

  /**
   * Get the number of non-expired entries currently in the cache.
   * @returns {number} The count of valid cache entries
   */
  get size() {
    const now = Date.now();
    let count = 0;
    for (const [, item] of this.cache) {
      if (now <= item.expiresAt) {
        count++;
      }
    }
    return count;
  }
}

// Export a singleton instance
const cache = new SimpleCache();
export { SimpleCache };
export default cache;
