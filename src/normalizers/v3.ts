// aggregates the data "tables" into single json files

import * as fs from 'fs';
import * as p from 'path';
import * as R from 'ramda';

import {index, UniqIndex} from '../utils/object.utils';
import {encodeStr} from '../utils/string.utils';
import {Champion, Synergy, SynergyType, Threshold} from '../models/data.models';

/* tslint:disable:no-console */

// config
const verbose = false;
const version = 'v3';
const source = p.join('data', version); // path to source data
const target = p.join('src', 'data', version); // target of generated file

console.log(__dirname);

type NormalData = Champion|Synergy;

// v3 raw data types
type RAW_champion = {
  name: string,
  championId: string,
  cost: number,
  traits: string[],
};

type RAW_item = {
  id: number,
  name: string,
};

type RAW_trait = {
  key: string,
  name: string,
  innate?: string,
  description: string,
  type: string,
  sets: {
    style: string,
    min: number,
    max?: number,
  }[],
};

type RAW_trait_effects = {
  key: string,
  sets: {
    min: number,
    effect: string,
  }[],
};


// =============================================

// Parse raw data as json from source
function parse<T>(path: string) {
  path = p.join(source, path);
  return new Promise<T>((resolve, reject) => {
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

const viewName = (t: {name: string}) => t.name;
const viewKey = (t: {key: string}) => t.key;

// Merges champions and traits
function mergeChampion(traits: RAW_trait[], c: RAW_champion): Champion {
  const traitsByName = index(traits, viewName) as UniqIndex<RAW_trait>;
  return {
    name: c.name,
    cost: Number(c.cost),
    origin: c.traits.filter(t => traitsByName[t].type === 'origin'),
    class: c.traits.filter(t => traitsByName[t].type === 'class'),
    icon: p.join(version, 'champions', encodeStr(c.name).toLowerCase()) + '.png',
  };
}

const eqMin = (x: {min: number}, y: {min: number}) => x.min === y.min;

function mergeSynergy(traitsEffects: RAW_trait_effects[], t: RAW_trait): Synergy {
  const traitsEffectsByKey = index(traitsEffects, viewKey) as UniqIndex<RAW_trait_effects>;
  const {name, innate, description, type, sets} = t;

  const {sets: effectsSets} = traitsEffectsByKey[t.key];
  const zset =  R.zip(sets, effectsSets);
  return {
    name,
    innate,
    description,
    type: type as SynergyType, // TODO fix this later
    thresholds: zset.map(([s, es]) => R.mergeRight(s, es)),
    icon: p.join(version, 'traits', encodeStr(t.name).toLowerCase()) + '.png',
  };
}

// Normalize into model app data
function normalize([
    champions,
    items,
    traits,
    traitsEffects
  ]: [
    RAW_champion[],
    RAW_item[],
    RAW_trait[],
    RAW_trait_effects[]
  ]): [Champion[], Synergy[]] {
  const championByName = R.indexBy(val => val.name, champions);
  const itemByName = R.indexBy(val => val.name, items);

  const normChampions = champions.map(c => mergeChampion(traits, c));
  const normSynergies = traits.map(t => mergeSynergy(traitsEffects, t));
  // const normItems = [];
  return [normChampions, normSynergies];
}

function writeAll(fileNames: string[]) {
  return (data: [Champion[], Synergy[]]) => {
    const ps = R.zip(fileNames, data).map(([path, d]) => write(path, d));
    // R.apply doesnt work because it assumes homogenous function params
    // const ps = R.zip(fileNames, data).map(R.apply(write));
    return Promise.all(ps);
  }
}

// Write normalized data as json files
function write(path: string, data: NormalData[]) {
  path = p.join(target, path);
  return new Promise<string>((resolve, reject) => {
    return fs.writeFile(path, JSON.stringify(data, null, 2), err => {
      if (err) {
        console.log(path, err);
        reject(err);
        return;
      }
      resolve(path);
    })
  });
}

Promise.all([
  parse<RAW_champion[]>('champions.json'),
  parse<RAW_item[]>('items.json'),
  parse<RAW_trait[]>('traits.json'),
  parse<RAW_trait_effects[]>('traits_effects.json'),
])
.then(normalize)
.then(writeAll([
  'champions.json',
  'synergies.json',
]))
.then(v => console.log(v, 'success'))
.catch((err: any) => console.log(`${source}: ${err}`));
