import React from 'react';
import { Graph } from 'react-d3-graph';

import * as dataModule from './data/champions.json';
import { mapsToD3Graph } from './loader/mapsToGraph';
import { jsonToMaps } from './loader/dataToMaps';
import './App.css';

const myConfig = {
  nodeHighlightBehavior: true,
  node: {
    color: 'lightgreen',
    size: 120,
    highlightStrokeColor: 'blue'
  },
  link: {
    highlightColor: 'lightblue'
  },
  height: window.innerHeight,
  width: window.innerWidth,
};

const champions = Object.values(dataModule.default);
// console.log(champions);
const maps = jsonToMaps(champions);
// console.log(maps);
const graph = mapsToD3Graph(champions, Object.values(maps));
console.log(graph);

function App() {
  return (
    <div className="App" style={{height: '100vh', width: '100vw'}}>
      <Graph id="graph" data={graph} config={myConfig} />
    </div>
  );
}

export default App;
