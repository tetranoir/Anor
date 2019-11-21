// Data replicas in js

// object keys properties
export const keys: SynergyType[] = ['class', 'origin'];

// unique object property
export type Identity = 'name';
export const id: Identity = 'name';
export interface Identifiable {
  name: string;
}

// champion interface (using object keys and object props)
export interface Champion {
  class: string[];
  origin: string[];
  name: string;
  cost: number;
  icon: string;
}

export const isChampion = o => {
  return keys.reduce((acc, key) => acc && Boolean(o[key]), true);
};

export const classstrs = [
  'assassin', 'blademaster', 'brawler', 'elementalist','guardian',
  'gunslinger', 'knight', 'ranger', 'shapeshifter', 'sorcerer'
].join('|');

export const originstrs = [
  'demon', 'dragon', 'exile', 'glacial', 'hextech', 'imperial', 'ninja',
  'robot', 'pirate', 'phantom', 'noble', 'void', 'wild', 'yordle'
].join('|');

export const datatype = {
  name: '',
  class: [classstrs],
  origin: [originstrs],
  iconSrc: '',
};

export type SynergyType = 'class' | 'origin';

// map of synergy name to synergy data
export interface SynergyMap {
  [synergy: string]: Synergy;
}

export interface SynergyTypeMap<T> {
  [synergyType: string]: {
    [synergy: string]: T;
  }
}

export interface Synergy {
  passive?: string;
  [threshold: number]: string;
}

// checks for module exports for node
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    keys,
    id,
    isChampion,
    classstrs,
    originstrs,
    datatype,
  };
}