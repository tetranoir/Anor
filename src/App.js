import React, { useState } from 'react';
import { Graph } from 'react-d3-graph';

import * as dataModule from './data/champions.json';
import { mapsToD3Graph } from './loader/mapsToGraph';
import { jsonToMaps } from './loader/dataToMaps';
import './App.css';

// UTIL
// no conflicting keys
function objFromAry(key, ary) {
  return ary.reduce((obj, el) => {
    obj[el[key]] = el;
    return obj;
  }, {});
}

// CONFIG
const keys = ['class', 'origin'];
const id = 'name';

const defaultConfig = {
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
};

// DATA
const champions = Object.values(dataModule.default).map(c => ({ ...c, active: true }));
console.log(window.champions = champions);

const maps = jsonToMaps(champions);
console.log(window.maps = maps);

// map of vals to keys (uniques vals)
const valToKey = champions.reduce((vals, c) => {
  keys.forEach(k => c[k].forEach(v => vals[v] = k));
  return vals;
}, {});
console.log(window.valToKey = valToKey);

// pure filters
const filterFns = Object.entries(valToKey).reduce((fMap, [val, key]) => {
  fMap[val] = c => c[key].includes(val);
  return fMap;
}, {});

// filters requiring maps in context
const filterContexts = Object.entries(valToKey).reduce((fMap, [val, key]) => {
  fMap[val] = isActive => {maps[key][val].forEach(c => c.active = isActive)}
  return fMap;
}, {});
console.log(window.filterContexts = filterContexts);


function useConfig(defaultConfig) {
  const [config, setConfig] = useState(defaultConfig);

  const ConfigEditor = (
    <div id="config-editor">
    </div>
  );

  return [config, ConfigEditor];
}

// creates check boxes based on a set of options and checked options
function renderAsCheckboxes(options, checkedOptions, onChange) {
  return Object.entries(options).map(([name, fn]) => (<React.Fragment key={name}>
    <input
      id={name}
      type="checkbox"
      value={name}
      checked={checkedOptions[name] ? true : false}
      onChange={onChange} />
    <label htmlFor={name}>{name}</label>
  </React.Fragment>));
}

// data -> list
function removeFrom(predicate, data) {
  return data.filter(d => !predicate(d));
}

// filterFns -> { name: filter() }
function useFilter(filterFns, data) {
  const [activeFilterMap, setFilter] = useState({});

  // sets or removes filter in active filter map based on checked box
  function onChange(e) {
    const { value, checked } = e.target;
    const newFilters = { ...activeFilterMap };
    if (checked) {
      filterFns[value](false);
      newFilters[value] = filterFns[value];
    } else {
      newFilters[value](true);
      delete newFilters[value];
    }
    setFilter(newFilters);
  }

  // apply negative filter on data
  // data.forEach(d => d.active = Object.values(filters)
  // .reduce((bool, filter) => bool && !filter(d), true));

  // runs all (context) filters
  // Object.values(activeFilterMap).forEach(f => f());

  const FilterEditor = (
    <div key="ff" id="filter-editor">
      {renderAsCheckboxes(filterFns, activeFilterMap, onChange)}
    </div>
  );

  return [activeFilterMap, FilterEditor];
}

function App() {
  const [config, ConfigEditor] = useConfig(defaultConfig);
  const [activeFilterMap, FilterEditor] = useFilter(filterContexts, champions);

  const [selection, setSelection] = useState([]);

  const filtered = objFromAry(id, champions.filter(c => !c.active));
  const graph = mapsToD3Graph(id, champions, filtered, Object.values(maps));
  return (
    <div className="app" style={{height: '100vh', width: '100vw'}}>
      {ConfigEditor}
      {FilterEditor}
      <Graph id="graph" data={graph} config={config} />
    </div>
  );
}

export default App;
