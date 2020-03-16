// aggregates the data "tables" into single json files

const fs = require('fs');
const p = require('path');

// config
const verbose = false;
const source = p.join('data', 'v3'); // path to source data
const target = p.join('src', 'data', 'v3'); // target of generated file

console.log(__dirname);

function arrayToObject(ary, getKey) {
  return ary.reduce((acc, val) => {
    acc[getKey(val)] = val;
    return acc;
  }, {});
}

// [ array, [fn, index] ]
const cache = [];
// Cache of indexes. Uses array and function references
function indexes(dataArray, keyFn) {
  const arrayHit = cache.find(([cachedArray, _]) => cachedArray === dataArray);
  if (!arrayHit) {
    const newIndex = arrayToObject(dataArray, keyFn);
    cache.append([dataArray, [keyFn, newIndex]]);
    return newIndex;
  }

  const [_, cachedIndexes] = arrayHit;
  const indexHit = cachedIndexes.find(([cachedFn, _]) => cachedFn === keyFn);
  if (!indexHit) {
    newIndex = arrayToObject(dataArray, keyFn);
    cachedIndexes.append([keyFn, newIndex]);
    return newIndex;
  }

  const [_, index] = indexHit;
  return index;
}

// =============================================

// Parse raw data
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
      } catch(err) {
        console.log(path, err);
        reject(err);
      }
    });
  });
}

const traitName = t => t.name;

// Merges champions and traits
function mergeChampion(traits, c) {
  const traitsByName = index(traits, traitName);
  return {
    name: c.name,
    tier: c.cost,
    origin: c.traits.filter(t => traitsByName[t].type === 'origin'),
    class: c.traits.filter(t => traitsByName[t].type === 'class'),
    icon: undefined,
  };
}

//
function mergeSynergy(t) {

}

// Normalize into model app data
function normalize([champions, items, traits]) {
  const championByName = arrayToObject(champions, val => val.name);
  const itemByName = arrayToObject(champions, val => val.name);

  const normChampion = champions.map(c => mergeChampion(traits, c));
  const normSynergy = traits.map(t => mergeSynergy(t));
  const normItem = [];
  return [normChampions, normSynergies, normItems];
}

Promise.all([
  parse('champions.json'),
  parse('items.json'),
  parse('traits.json'),
]).then(normalize);
