// object keys properties
export const keys = ['class', 'origin'];

// unique object property
export const id = 'name';

// champion interface (using object keys and object props)
export interface Champion {
  class: string[];
  origin: string[];
  name: string;
}

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
