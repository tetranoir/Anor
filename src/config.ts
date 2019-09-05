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
    gravity: -150,
  },
  panAndZoom: false,
  maxZoom: 1,
  minZoom: 1,
  // staticGraph: true,
  highlightDegree: 1,
  highlightOpacity: 0.3,
};
