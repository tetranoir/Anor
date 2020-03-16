import * as R from 'ramda';
import { useState, useEffect} from 'react';

import { Item } from './modeldata';

/* Used as global singleton */
const urlParams = new URLSearchParams(window.location.search);
/**
 * Only pulls from url state once, on load. But will continue to update url.
 * This is an optimzation requirement.
 */
function useUrlState(name, Type, defaultValue) {
  let hasLoaded = false;

  const [value, setValue] = useState(
    urlParams.has(name) ? Type.deserialize(urlParams.get(name)) : defaultValue
  );

  useEffect(() => {
    if (!hasLoaded) return;

    if (value === defaultValue) {
      urlParams.delete(name);
    } else {
      urlParams.set(name, Type.serialize(value));
    }
    window.history.replaceState({}, '', `${window.location.pathname}?${urlParams}`);
  }, [value]);

  hasLoaded = true;

  return [value, setValue];
}

const BooleanVal = {
  deserialize(v: string): boolean {
    return v === '1';
  },
  serialize(v: boolean): string {
    return v ? '1' : '0';
  },
};

// State handling in app
interface StateVars {
  filtered: boolean;
  selected: boolean;
  grouped: boolean;
  highlighted: boolean;
  hovered: boolean;
}
interface StateSets {
  setFiltered: (boolean) => void;
  setSelected: (boolean) => void;
  setGrouped: (boolean) => void;
  setHighlighted: (boolean) => void;
  setHovered: (boolean) => void;
}
// Stateful properites of for interactable objects
export type State = StateVars & StateSets;
// Attaches State functionality to object
export function useAppState<T>(t: T, id: string): State & T {
  const [filtered, setFiltered] = useState(false);
  const [selected, setSelected] = useUrlState(id, BooleanVal, false);
  const [grouped, setGrouped] = useState(false);
  const [highlighted, setHighlighted] = useState(false);
  const [hovered, setHovered] = useState(false);

  return {
    ...t,
    filtered,
    selected,
    grouped,
    highlighted,
    hovered,
    setFiltered,
    setSelected,
    setGrouped,
    setHighlighted,
    setHovered,
  };
}

// Picks state props from an object
export const pickStateVars: (o: StateVars) => StateVars = R.pick([
  'filtered',
  'selected',
  'grouped',
  'highlighted',
  'hovered',
]);

export const mergeStateVars = (a: StateVars, b: StateVars): StateVars => ({
  filtered: a.filtered && b.filtered,
  selected: a.selected && b.selected,
  grouped: a.grouped && b.grouped,
  highlighted: a.highlighted && b.highlighted,
  hovered: a.hovered && b.hovered,
});

// TODO: move somewhere because these are data+app convenience types
// Synergy handling in app
export type Threshold = [number, string];

export interface SynergyThreshold {
  name: string;
  threshes: Threshold[];
}

// Enrichments are for functions and
// Adds stuff to synergy to make it easier to use
export interface SynergyEnrichment extends SynergyThreshold {
  getThresholdStr: (n: number) => Threshold | null;
}

export interface ItemEnrichment<T extends Item> {
  // The items this item is in recipes for.
  usedIn: T[];
  // the items this item is made from.
  madeFrom: T[];
}

export interface ChampionEnrichment {
  // Short name, lowercase using only word (\w) characters. Used in URL
  short: string;
}
