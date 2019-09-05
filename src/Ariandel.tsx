import React, { useState, useEffect, useLayoutEffect, useMemo } from 'react';
import { Graph } from 'react-d3-graph';

import { objFromAry } from './util';
import { defaultConfig } from './config';
import { keys, isChampion, Champion, id } from './knowledge/modeldata';
import * as dataModule from './data/champions.json';
import { mapsToD3Graph } from './loader/mapsToGraph';
import { jsonToMaps } from './loader/dataToMaps';
import './App.css';

declare global {
  interface Window {
    champions: any;
    keyToMap: any;
    valToKey: any;
    idToChampion: any;
    useChampion: any;
  }
}

interface State {
  active: boolean;
  selected: boolean;
  setActive: (boolean) => void;
  setSelected: (boolean) => void;
  render: () => void;
}

type ChampionState = State & Champion;

function useChampion(champion: Champion) {
  const [active, setActive] = useState(true);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [selected, setSelected] = useState(false);

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

  return {
    ...champion,
    render,
    active,
    setActive,
    setSelected,
    selected,
  };
}

// DATA
const data = Object.values((dataModule as any).default) as Champion[];

function setChampionData(data) {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const champions: ChampionState[] = data.map(c => useChampion(c));
  window.champions = champions;
  const idToChampion = objFromAry(id, champions);
  window.idToChampion = idToChampion;
  const keyToMap = jsonToMaps(champions);
  window.keyToMap = keyToMap;
  // map of vals to keys (uniques vals)
  const valToKey = champions.reduce((vals, c) => {
    keys.forEach(k => (c[k] || []).forEach(v => vals[v] = k));
    return vals;
  }, {});
  window.valToKey = valToKey;

  return { keyToMap, idToChampion, champions };
}

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

// return render: list of inputs
function renderMapAsCheckboxes(name, map, depth = 0): {render: React.ReactElement, checked: boolean} {
  function mapCheckboxOnChange(e) {
    const { value, checked } = e.target;
    walkLeaves(champion => champion.setActive(checked), isLeaf, map[value]);
  }

  const { render, checked } = Object.entries(map[name]).reduce((acc, [k, v]) => {
    if (isLeaf(v)) {
      // acc.render.push(renderObjAsCheckbox(v));
      // eslint-disable-next-line react-hooks/rules-of-hooks
      acc.render.push(v.render);
      acc.checked = acc.checked && v.active;
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
  // const [selectedMap, setSelectedMap] = useState({});

  const { champions, keyToMap, idToChampion } = setChampionData(data);

  function onClickNode(id) {
    const champion = idToChampion[id];
    // eslint-disable-next-line react-hooks/rules-of-hooks
    champion.setSelected(!champion.selected);
  }

  const filteredMap = objFromAry(id, champions.filter(c => !c.active));
  const selectedMap = objFromAry(id, champions.filter(c => c.selected));
  console.log('ARIANDEL RENDER', filteredMap, selectedMap);
  const render = renderKeysAsCheckboxes(keyToMap);
  const graph = mapsToD3Graph(id, champions, idToChampion, Object.values(keyToMap));
  return (
    <div className="app" style={{height: '100vh', width: '100vw'}}>
      {ConfigEditor}
      {render}
      <Graph id="graph" data={graph} config={config} onClickNode={onClickNode} />
    </div>
  );
}

export default Astoria;
