"use strict";
// aggregates the data "tables" into single json files
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const p = __importStar(require("path"));
const R = __importStar(require("ramda"));
const object_utils_1 = require("../utils/object.utils");
const string_utils_1 = require("../utils/string.utils");
/* tslint:disable:no-console */
// config
const verbose = false;
const version = 'v3';
const source = p.join('data', version); // path to source data
const target = p.join('src', 'data', version); // target of generated file
console.log(__dirname);
// =============================================
// Parse raw data as json from source
function parse(path) {
    path = p.join(source, path);
    return new Promise((resolve, reject) => {
        fs.readFile(path, (err, file) => {
            if (err) {
                console.log(path, err);
                reject(err);
                return;
            }
            try {
                const json = JSON.parse(file.toString());
                resolve(json);
            }
            catch (err) {
                console.log(path, err);
                reject(err);
            }
        });
    });
}
const viewName = (t) => t.name;
const viewKey = (t) => t.key;
// Merges champions and traits
function mergeChampion(traits, c) {
    const traitsByName = object_utils_1.index(traits, viewName);
    return {
        name: c.name,
        cost: Number(c.cost),
        origin: c.traits.filter(t => traitsByName[t].type === 'origin'),
        class: c.traits.filter(t => traitsByName[t].type === 'class'),
        icon: p.join(version, 'champions', string_utils_1.encodeStr(c.name).toLowerCase()) + '.png',
    };
}
const eqMin = (x, y) => x.min === y.min;
function mergeSynergy(traitsEffects, t) {
    const traitsEffectsByKey = object_utils_1.index(traitsEffects, viewKey);
    const { name, innate, description, type, sets } = t;
    const { sets: effectsSets } = traitsEffectsByKey[t.key];
    const zset = R.zip(sets, effectsSets);
    return {
        name,
        innate,
        description,
        type: type,
        thresholds: zset.map(([s, es]) => R.mergeRight(s, es)),
        icon: p.join(version, 'traits', string_utils_1.encodeStr(t.name).toLowerCase()) + '.png',
    };
}
// Normalize into model app data
function normalize([champions, items, traits, traitsEffects]) {
    const championByName = R.indexBy(val => val.name, champions);
    const itemByName = R.indexBy(val => val.name, items);
    const normChampions = champions.map(c => mergeChampion(traits, c));
    const normSynergies = traits.map(t => mergeSynergy(traitsEffects, t));
    // const normItems = [];
    return [normChampions, normSynergies];
}
function writeAll(fileNames) {
    return (data) => {
        const ps = R.zip(fileNames, data).map(([path, d]) => write(path, d));
        // R.apply doesnt work because it assumes homogenous function params
        // const ps = R.zip(fileNames, data).map(R.apply(write));
        return Promise.all(ps);
    };
}
// Write normalized data as json files
function write(path, data) {
    path = p.join(target, path);
    return new Promise((resolve, reject) => {
        return fs.writeFile(path, JSON.stringify(data, null, 2), err => {
            if (err) {
                console.log(path, err);
                reject(err);
                return;
            }
            resolve(path);
        });
    });
}
Promise.all([
    parse('champions.json'),
    parse('items.json'),
    parse('traits.json'),
    parse('traits_effects.json'),
])
    .then(normalize)
    .then(writeAll([
    'champions.json',
    'synergies.json',
]))
    .then(v => console.log(v, 'success'))
    .catch((err) => console.log(`${source}: ${err}`));
//# sourceMappingURL=v3.js.map