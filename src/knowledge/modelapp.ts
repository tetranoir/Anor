import * as R from 'ramda';
import { useState } from 'react';

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
export function useAppState<T>(t: T): State & T {
  const [filtered, setFiltered] = useState(false);
  const [selected, setSelected] = useState(false);
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

// Adds stuff to synergy to make it easier to use
export interface SynergyEnrichment extends SynergyThreshold {
  getThresholdStr: (n: number) => Threshold | null;
}
