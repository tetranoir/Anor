// Depricated v3
import React, { useState, useEffect, useLayoutEffect } from 'react';
import { Graph } from 'react-d3-graph';

import { objFromAry } from './util';
import { graphConfig } from './config';
import { keys, isChampion, Champion, id } from './knowledge/modeldata';
import { mapToReactD3Graph } from './loader/mapsToGraph';
import { jsonToMaps } from './loader/dataToMaps';
import './App.css';

// TODO: maybe consolidate into 1 data import?
import * as dataModule from './data/champions.json';
import * as synergyModule from './data/synergies.json';

declare global {
  interface Window {
    champions: any;
    keyToMap: any;
    valToKey: any;
  }
}

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}

interface State {
  active: boolean;
  selected: boolean;
}

type ChampionState = State & Champion;

// DATA
const data = Object.values((dataModule as any).default) as Champion[];
const champions: ChampionState[] = data.map(c => ({ ...c, active: true, selected: false }));
console.log(window.champions = champions);
const idToChampion = objFromAry(id, champions);

const keyToMap = jsonToMaps(champions);
console.log(window.keyToMap = keyToMap);

// map of vals to keys (uniques vals)
const valToKey = champions.reduce((vals, c) => {
  keys.forEach(k => (c[k] || []).forEach(v => vals[v] = k));
  return vals;
}, {});
console.log(window.valToKey = valToKey);


function useConfig(graphConfig) {
  const [config, setConfig] = useState(graphConfig);

  const ConfigEditor = (
    <div id="config-editor">
    </div>
  );

  return [config, ConfigEditor];
}

// all keys must exist to be considered a leaf
function isLeaf(obj): obj is ChampionState {
  return isChampion(obj);
}

// walk an js object tree
function walkLeaves(cb, isLeaf, tree) {
  if (isLeaf(tree)) {
    cb(tree);
  } else if (typeof tree !== 'object') {
    // do nothing
  } else {
    Object.values(tree).forEach(child => walkLeaves(cb, isLeaf, child));
  }
}

function LabeledCheckbox({label, checked, onChange, className, children = []}) {
  return (
    <div className={className}>
      <div className="labeledinput">
        <input
          id={label}
          type="checkbox"
          value={label}
          checked={checked}
          onChange={onChange}
        />
        <label htmlFor={label}>{label}</label>
      </div>
      {children}
    </div>
  );
}

function useChampion(champion?: ChampionState) {
  if (!champion) {
    return useChampion.memo;
  }
  if (useChampion.memo[champion[id]]) {
    return useChampion.memo[champion[id]];
  }
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [active, setActive] = useState(champion.active);
  champion.active = active; // sychronous side effect

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [selected, setSelected] = useState(champion.selected);
  champion.selected = selected; // sychronous side effect

  // use setActive from closure
  function onChange(e) {
    setActive(e.target.checked);
  }

  const render = (
    <LabeledCheckbox
      key={champion.name}
      label={champion.name}
      checked={active}
      onChange={onChange}
      className="champion"
    />
  );

  useChampion.memo[champion[id]] = { render, active, setActive, setSelected, selected };
  // console.log('count', Object.values(useChampion.memo).length);
  return useChampion.memo[champion[id]];
}
useChampion.memo = {};

// return render: list of inputs
function renderMapAsCheckboxes(name, map, depth = 0): {render: React.ReactElement, checked: boolean} {
  function mapCheckboxOnChange(e) {
    const { value, checked } = e.target;
    walkLeaves(champion => useChampion(champion).setActive(checked), isLeaf, map[value]);
  }

  const { render, checked } = Object.entries(map[name]).reduce((acc, [k, v]) => {
    if (isLeaf(v)) {
      // acc.render.push(renderObjAsCheckbox(v));
      // eslint-disable-next-line react-hooks/rules-of-hooks
      acc.render.push(useChampion(v).render);
      acc.checked = acc.checked && useChampion(v).active;
    } else {
      const { render, checked } = renderMapAsCheckboxes(k, map[name], depth+1);
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
        className={['container', `depth${depth}`].join(' ')}
      >
        {render}
      </LabeledCheckbox>
    ),
    checked,
  };
}

// creates check boxes with objects at leaves, based on a maps of props vals -> objs
function renderKeysAsCheckboxes(keyToMap) {
  const [hidden, setHidden] = useState(false);

  function toggleHidden() {
    setHidden(!hidden);
  }

  const checkboxes = Object.entries(keyToMap).map(([key, valMap]) => {
    const { render, checked } = renderMapAsCheckboxes(key, keyToMap);
    return render;
  });

  return (
    <div className="checkboxes-container">
      <div className="checkboxes" hidden={hidden}>
        {checkboxes}
      </div>
      <div className="checkboxes-toggle" onClick={toggleHidden}>
        Filters
      </div>
    </div>
  );
}

// try constructing inside first, then build outer
function Astoria() {
  const [config, ConfigEditor] = useConfig(graphConfig);
  // const [selectedMap, setSelectedMap] = useState({});

  function onClickNode(id) {
    const champion = useChampion.memo[id];
    // eslint-disable-next-line react-hooks/rules-of-hooks
    champion.setSelected(!champion.selected);
  }

  // because rendermap needs it reset
  useChampion.memo = {};
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const filteredMap = objFromAry(id, champions.filter(c => !useChampion(c).active));
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const selectedMap = objFromAry(id, champions.filter(c => useChampion(c).selected));
  console.log('ASTORIA RENDER', filteredMap) //, selectedMap);
  const render = renderKeysAsCheckboxes(keyToMap);
  const graph = mapToReactD3Graph(id, champions, useChampion(), Object.values(keyToMap));
  return (
    <div className="app" style={{height: '100vh', width: '100vw'}}>
      {ConfigEditor}
      {render}
      <Graph id="graph" data={graph} config={config} onClickNode={onClickNode} />
    </div>
  );
}

export default Astoria;
