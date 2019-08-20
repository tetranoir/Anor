// object keys
export const keys = ['class', 'origin'];

// unique object prop
export const id = 'name';

// graph config
export const defaultConfig = {
  nodeHighlightBehavior: true,
  node: {
    color: 'lightblue',
    size: 500,
    highlightStrokeColor: 'navy'
  },
  link: {
    highlightColor: 'navy'
  },
  height: window.innerHeight,
  width: window.innerWidth,
  d3: {
    gravity: -300,
  },
  panAndZoom: false,
  maxZoom: 1,
  minZoom: 1,
};
