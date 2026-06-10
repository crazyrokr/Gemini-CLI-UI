/**
 * DAG lane-allocation algorithm for commit graph visualization.
 * Extracted for testability — used by graphWorker.js.
 */

export const BRANCH_COLORS = [
  '#7c6ff7',
  '#22d3ee',
  '#4ade80',
  '#fb923c',
  '#f472b6',
  '#2dd4bf',
  '#facc15',
  '#f87171',
];

export function computeLanes(commits) {
  if (!commits || commits.length === 0) return [];

  const hashToLane = {};
  const activeLanes = [];

  const layout = commits.map((commit, idx) => {
    const { hash, parents = [] } = commit;
    if (!hash) {
      throw new TypeError(`Commit at index ${idx} missing required hash property`);
    }

    let lane;
    if (hashToLane[hash] !== undefined) {
      lane = hashToLane[hash];
    } else {
      lane = activeLanes.findIndex(h => h === null || h === undefined);
      if (lane === -1) lane = activeLanes.length;
    }

    activeLanes[lane] = hash;
    const color = BRANCH_COLORS[lane % BRANCH_COLORS.length];

    const edges = [];
    parents.forEach((parentHash, pIdx) => {
      if (!parentHash) return;

      const isMerge = pIdx > 0;
      let toLane;
      let isSplit = false;

      if (hashToLane[parentHash] !== undefined) {
        toLane = hashToLane[parentHash];
        isSplit = true;
      } else {
        if (!isMerge) {
          toLane = lane;
          hashToLane[parentHash] = lane;
        } else {
          toLane = activeLanes.findIndex(h => h === null || h === undefined);
          if (toLane === -1) toLane = activeLanes.length;
          hashToLane[parentHash] = toLane;
          activeLanes[toLane] = parentHash;
        }
      }

      edges.push({
        fromLane: lane,
        toLane,
        parentHash,
        type: isMerge ? 'merge' : 'direct',
        isSplit,
      });
    });

    const continuingLanes = parents.map(p => hashToLane[p]);
    if (!continuingLanes.includes(lane)) {
      activeLanes[lane] = null;
    }

    return {
      ...commit,
      lane,
      color,
      edges,
    };
  });

  return layout;
}
