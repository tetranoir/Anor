import React, { useState, useEffect, useLayoutEffect } from 'react';
import { Graph } from 'react-d3-graph';

import { objFromAry } from './util';
import { keys, Champion, id, defaultConfig } from './config';
import * as dataModule from './data/champions.json';
import { mapsToD3Graph } from './loader/mapsToGraph';
import { jsonToMaps } from './loader/dataToMaps';
import './App.css';

declare global {
  interface Window {
    champions: any;
    keyToMap: any;
    valToKey: any;
  }
}

interface State {
  active: boolean;
}

type ChampionState = State & Champion;

// DATA
const data = Object.values((dataModule as any).default) as Champion[];
const champions: ChampionState[] = data.map(c => ({ ...c, active: true }));
console.log(window.champions = champions);
const idToChampion = objFromAry(id, champions);

const keyToMap = jsonToMaps(champions);
console.log(window.keyToMap = keyToMap);

// map of vals to keys (uniques vals)
const valToKey = champions.reduce((vals, c) => {
  keys.forEach(k => c[k].forEach(v => vals[v] = k));
  return vals;
}, {});
console.log(window.valToKey = valToKey);


function useConfig(defaultConfig) {
  const [config, setConfig] = useState(defaultConfig);

  const ConfigEditor = (
    <div id="config-editor">
    </div>
  );

  return [config, ConfigEditor];
}

// all keys must exist to be considered a leaf
function isLeaf(obj): obj is ChampionState {
  return keys.reduce((acc, key) => acc && Boolean(obj[key]), true);
}

// walk an js object tree
function walkLeaves(cb, isLeaf, tree) {
  if (isLeaf(tree)) {
    cb(tree);
  } else {
    Object.values(tree).forEach(child => walkLeaves(cb, isLeaf, child));
  }
}

function LabeledCheckbox({label, checked, onChange, className, children = []}) {
  return (
    <div className={className}>
      <input
        id={label}
        type="checkbox"
        value={label}
        checked={checked}
        onChange={onChange}
      />
      <label htmlFor={label}>{label}</label>
      {children}
    </div>
  );
}

function useChampion(champion: ChampionState) {
  if (useChampion.memo[champion[id]]) {
    return useChampion.memo[champion[id]];
  }
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [active, setActive] = useState(champion.active);

  // use setActive from closure
  function onChange(e) {
    setActive(e.target.checked);
    champion.active = e.target.checked; // synchronous side effect
  }

  const render = (
    <LabeledCheckbox
      key={champion.name}
      label={champion.name}
      checked={active}
      onChange={onChange}
      className="container"
    />
  );

  useChampion.memo[champion[id]] = render;
  return render;
}
useChampion.memo = {};

// return render: list of inputs
function renderMapAsCheckboxes(name, map): {render: React.ReactElement, checked: boolean} {
  function mapCheckboxOnChange(e) {
    const { value, checked } = e.target;
    walkLeaves(obj => obj.active = checked, isLeaf, map[value]);
  }

  const { render, checked } = Object.entries(map[name]).reduce((acc, [k, v]) => {
    if (isLeaf(v)) {
      // acc.render.push(renderObjAsCheckbox(v));
      // eslint-disable-next-line react-hooks/rules-of-hooks
      acc.render.push(useChampion(v));
      acc.checked = acc.checked && v.active;
    } else {
      const { render, checked } = renderMapAsCheckboxes(k, map[name]);
      acc.render.push(render);
      acc.checked = acc.checked && checked;
    }
    return acc;
  }, { render: [], checked: true });

  return {
    render: (
      <LabeledCheckbox
        key={name}
        label={name}
        checked={checked}
        onChange={mapCheckboxOnChange}
        className="container"
      >
        {render}
      </LabeledCheckbox>
    ),
    checked,
  };
}

// creates check boxes with objects at leaves, based on a maps of props vals -> objs
function renderKeysAsCheckboxes(keyToMap) {
  // because rendermap needs it reset
  useChampion.memo = {};

  const checkboxes = Object.entries(keyToMap).map(([key, valMap]) => {
    const { render, checked } = renderMapAsCheckboxes(key, keyToMap);
    return render;
  });

  return (
    <div className="checkboxes">
      {checkboxes}
    </div>
  );
}

// try constructing inside first, then build outer
function Astoria() {
  const [config, ConfigEditor] = useConfig(defaultConfig);

  const filteredMap = objFromAry(id, champions.filter(c => !c.active));
  const graph = mapsToD3Graph(id, champions, filteredMap, Object.values(keyToMap));
  console.log('ASTORIA RENDER');
  return (
    <div className="app" style={{height: '100vh', width: '100vw'}}>
      {ConfigEditor}
      {renderKeysAsCheckboxes(keyToMap)}
      <Graph id="graph" data={graph} config={config} />
    </div>
  );
}

export default Astoria;
