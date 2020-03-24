"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const R = __importStar(require("ramda"));
// indexer function
// object produces multiple keys, conflicting keys merged into array
function multiKeyToIX(ary, getKey) {
    return ary.reduce((acc, val) => {
        const keys = getKey(val);
        keys.forEach(key => {
            if (!acc[key]) {
                acc[key] = [];
            }
            acc[key].push(val);
        });
        return acc;
    }, {});
}
exports.multiKeyToIX = multiKeyToIX;
// indexer function
// conflicting keys merged into array
function keyToIX(ary, getKey) {
    return ary.reduce((acc, val) => {
        const key = getKey(val);
        if (!acc[key]) {
            acc[key] = [];
        }
        acc[key].push(val);
        return acc;
    }, {});
}
exports.keyToIX = keyToIX;
// indexer function
// no conflicting keys
function keyToUX(ary, getKey) {
    return ary.reduce((acc, val) => {
        const key = getKey(val);
        acc[key] = val;
        return acc;
    }, {});
}
exports.keyToUX = keyToUX;
/**
 * UNIQUE
 * Index creates an index with cache. It relies on the same list and function
 * to retrieve from cache.
 * How to use:
 *    const index = Index();
 *    const idfn = o => o.id;
 *    const objectById = index(objects, idfn);
 */
function Index() {
    // [ array, [fn, index] ]
    const cache = [];
    // Cache of indexes. Uses array and function references
    return function index(dataArray, keyFn) {
        const arrayHit = cache.find(([cachedArray,]) => cachedArray === dataArray);
        if (!arrayHit) {
            const newIndex = keyToUX(dataArray, keyFn);
            cache.push([dataArray, [[keyFn, newIndex]]]);
            return newIndex;
        }
        const [, cachedIndexes] = arrayHit;
        const indexHit = cachedIndexes.find(([cachedFn,]) => cachedFn === keyFn);
        if (!indexHit) {
            const newIndex = keyToUX(dataArray, keyFn);
            cachedIndexes.push([keyFn, newIndex]);
            return newIndex;
        }
        const [, cachedIndex] = indexHit;
        return cachedIndex;
    };
}
exports.Index = Index;
// Global singleton Index
exports.index = Index();
// Cached R.prop
function Prop() {
    const cache = {};
    return function prop(p) {
        if (cache[p]) {
            return cache[p];
        }
        return R.prop(p);
    };
}
exports.Prop = Prop;
// Global singleton Prop
exports.prop = Prop();
//# sourceMappingURL=object.utils.js.map