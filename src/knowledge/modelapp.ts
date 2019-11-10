import * as R from 'ramda';

interface StateVars {
  active: boolean;
  selected: boolean;
  grouped: boolean;
  highlighted: boolean;
  hovered: boolean;
}
// Stateful properites of for interactable objects
export interface State extends StateVars {
  render: () => void;
  setActive: (boolean) => void;
  setSelected: (boolean) => void;
  setGrouped: (boolean) => void;
  setHighlighted: (boolean) => void;
  setHovered: (boolean) => void;
}

// Picks state props from an object
export const pickState: (o: StateVars) => StateVars = R.pick([
  'active',
  'selected',
  'grouped',
  'highlighted',
  'hovered',
]);
