'use strict';

/**
 * Simple in-memory cache for menu data.
 * Avoids hitting MongoDB on every page load.
 * TTL: 5 minutes by default.
 */

const store = new Map();

/**
 * Get a cached value
 * @param {string} key
 * @returns {any|null}
 */
function get(key) {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

/**
 * Set a cached value
 * @param {string} key
 * @param {any} value
 * @param {number} ttlMs — time to live in milliseconds (default 5 min)
 */
function set(key, value, ttlMs = 5 * 60 * 1000) {
  store.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
}

/**
 * Delete a specific key
 * @param {string} key
 */
function del(key) {
  store.delete(key);
}

/**
 * Delete all keys that start with a prefix
 * @param {string} prefix
 */
function delByPrefix(prefix) {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}

/**
 * Clear entire cache
 */
function clear() {
  store.clear();
}

/**
 * Get cache stats (useful for debugging)
 */
function stats() {
  return {
    size:    store.size,
    keys:    [...store.keys()],
  };
}

module.exports = { get, set, del, delByPrefix, clear, stats };