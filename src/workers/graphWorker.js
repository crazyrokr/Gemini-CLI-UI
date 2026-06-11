/**
 * graphWorker.js — Web Worker
 * Runs the DAG lane-allocation algorithm off the main thread.
 * Receives: raw commit array from useGitStore
 * Posts back: layout array with { hash, lane, color, edges }
 */

import { computeLanes } from './computeLanes.js';

self.onmessage = function ({ data }) {
  try {
    if (data != null && !Array.isArray(data)) {
      throw new TypeError('Expected commits array');
    }
    const layout = computeLanes(data);
    self.postMessage({ success: true, layout });
  } catch (err) {
    self.postMessage({ success: false, error: err.message, stack: err.stack });
  }
};
