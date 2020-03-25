import {Z} from 'presi';

// App model replicas in js

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

export function isChampion(o: any): o is Champion {
  return keys.reduce((acc, key) => acc && Boolean(o[key]), true as boolean);
};

export const SynergyType = Z.oneOf(Z.literal('class'), Z.literal('origin'));
export type SynergyType = ReturnType<typeof SynergyType>;

// map of synergy name to synergy data
export interface SynergyMap {
  [synergy: string]: Synergy;
}

export interface SynergyTypeMap<T> {
  [synergyType: string]: {
    [synergy: string]: T;
  }
}

export type Threshold = {
  style: string;
  effect: string;
  min: number;
  max?: number;
};

export interface Synergy {
  name: string;
  innate?: string;
  description?: string;
  type: SynergyType;
  thresholds: Threshold[];
  icon: string;
}

export interface Item {
  name: string,
  short?: string,
  recipe?: string[],
  effect: string,
  icon?: string,
}

// checks for module exports for node
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    keys,
    id,
    isChampion,
  };
}