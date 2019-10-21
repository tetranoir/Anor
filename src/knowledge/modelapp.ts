export interface State {
  active: boolean;
  selected: boolean;
  grouped: boolean;
  setActive: (boolean) => void;
  setSelected: (boolean) => void;
  setGrouped: (boolean) => void;
  render: () => void;
}
