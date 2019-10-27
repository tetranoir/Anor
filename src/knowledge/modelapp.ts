export interface State {
  render: () => void;
  active: boolean;
  selected: boolean;
  grouped: boolean;
  highlighted: boolean;
  setActive: (boolean) => void;
  setSelected: (boolean) => void;
  setGrouped: (boolean) => void;
  setHighlighted: (boolean) => void;
}
