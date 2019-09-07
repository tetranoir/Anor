// object keys properties
export const keys = ['class', 'origin'];

// unique object property
export const id = 'name';

// champion interface (using object keys and object props)
export interface Champion {
  class: string[];
  origin: string[];
  name: string;
  cost: number;
  iconSrc: string;
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