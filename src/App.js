import React, { useState } from 'react';
import { Graph } from 'react-d3-graph';

import * as dataModule from './data/champions.json';
import { mapsToD3Graph } from './loader/mapsToGraph';
import { jsonToMaps } from './loader/dataToMaps';
import './App.css';

const defaultConfig = {
  nodeHighlightBehavior: true,
  node: {
    color: 'lightblue',
    size: 300,
    highlightStrokeColor: 'navy'
  },
  link: {
    highlightColor: 'navy'
  },
  height: window.innerHeight,
  width: window.innerWidth,
  d3: {
    gravity: -600,
  },
};

const champions = Object.values(dataModule.default);
// console.log(champions);
const maps = jsonToMaps(champions);
console.log(maps);
const graph = mapsToD3Graph(champions, Object.values(maps));
console.log(graph);

function useConfig() {
  const [config, setConfig] = useState(defaultConfig);

  const ConfigEditor = (
    <div id="config-editor">
    </div>
  );

  return [config, ConfigEditor];
}

function App() {
  const [config, ConfigEditor] = useConfig();

  return (
    <div className="app" style={{height: '100vh', width: '100vw'}}>
      {ConfigEditor}
      <Graph id="graph" data={graph} config={config} />
    </div>
  );
}

export default App;
