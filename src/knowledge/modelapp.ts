import * as R from 'ramda';

// State handling in app
interface StateVars {
  active: boolean;
  selected: boolean;
  grouped: boolean;
  highlighted: boolean;
  hovered: boolean;
}
// Stateful properites of for interactable objects
export interface State extends StateVars {
  setActive: (boolean) => void;
  setSelected: (boolean) => void;
  setGrouped: (boolean) => void;
  setHighlighted: (boolean) => void;
  setHovered: (boolean) => void;
}

// Picks state props from an object
export const pickStateVars: (o: StateVars) => StateVars = R.pick([
  'active',
  'selected',
  'grouped',
  'highlighted',
  'hovered',
]);

export const mergeStateVars = (a: StateVars, b: StateVars): StateVars => ({
  active: a.active && b.active,
  selected: a.selected && b.selected,
  grouped: a.grouped && b.grouped,
  highlighted: a.highlighted && b.highlighted,
  hovered: a.hovered && b.hovered,
});

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
