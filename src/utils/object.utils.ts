import * as R from 'ramda';

// UX
export type UniqIndex<T> = {[k: string]: T};
// IX
export type NonUniqIndex<T> = {[k: string]: T[]};

// indexer function
// object produces multiple keys, conflicting keys merged into array
export function multiKeyToIX<T>(ary: T[], getKey: (val: T) => string[]):
    NonUniqIndex<T> {
  return ary.reduce((acc, val) => {
    const keys = getKey(val);
    keys.forEach(key => {
      if (!acc[key]) {
         acc[key] = [];
      }
      acc[key].push(val);
    });
    return acc;
  }, {} as NonUniqIndex<T>);
}

// indexer function
// conflicting keys merged into array
export function keyToIX<T>(ary: T[], getKey: (val: T) => string):
    NonUniqIndex<T> {
  return ary.reduce((acc, val) => {
    const key = getKey(val);
    if (!acc[key]) {
       acc[key] = [];
    }
    acc[key].push(val);
    return acc;
  }, {} as NonUniqIndex<T>);
}

// indexer function
// no conflicting keys
export function keyToUX<T>(ary: T[],
    getKey: (val: T) => string): UniqIndex<T> {
  return ary.reduce((acc, val) => {
    const key = getKey(val);
    acc[key] = val;
    return acc;
  }, {} as  UniqIndex<T>);
}

/**
 * UNIQUE
 * Index creates an index with cache. It relies on the same list and function
 * to retrieve from cache.
 * How to use:
 *    const index = Index();
 *    const idfn = o => o.id;
 *    const objectById = index(objects, idfn);
 */
export function Index() {
  // [ array, [fn, index] ]
  const cache: [unknown[], [(a: any) => string, UniqIndex<any>][]][] = [];
  // Cache of indexes. Uses array and function references
  return function index<T>(dataArray: T[], keyFn: (val: T) => string): UniqIndex<T> {
    const arrayHit = cache.find(([cachedArray, ]) => cachedArray === dataArray);
    if (!arrayHit) {
      const newIndex = keyToUX(dataArray, keyFn);
      cache.push([dataArray, [[keyFn, newIndex]]]);
      return newIndex;
    }

    const [, cachedIndexes] = arrayHit;
    const indexHit = cachedIndexes.find(([cachedFn, ]) => cachedFn === keyFn);
    if (!indexHit) {
      const newIndex = keyToUX(dataArray, keyFn);
      cachedIndexes.push([keyFn, newIndex]);
      return newIndex;
    }

    const [, cachedIndex] = indexHit;
    return cachedIndex;
  }
}

// Global singleton Index
export const index = Index();

// Cached R.prop
export function Prop() {
  const cache: {[p: string]: (a: any) => any} = {};
  return function prop(p: string) {
    if (cache[p]) {
      return cache[p];
    }
    return R.prop(p);
  }
}

// Global singleton Prop
export const prop = Prop();

// Count accumulator
export function counter(acc: {[item: string]: number}, item: string) {
  if (!acc[item]) {
    acc[item] = 0;
  }
  acc[item] += 1;
  return acc;
}
