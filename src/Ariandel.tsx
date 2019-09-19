import React, { useState, useEffect, useLayoutEffect, useMemo } from 'react';
import { Graph } from 'react-d3-graph';

import { objFromAry } from './util';
import { defaultConfig } from './config';
import { keys, isChampion, Champion, id, Synergy, SynergyMap} from './knowledge/modeldata';

import { mapsToD3Graph } from './loader/mapsToGraph';
import { jsonToMaps } from './loader/dataToMaps';
import './App.css';

// TODO: maybe consolidate into 1 data import?
import * as dataModule from './data/champions.json';
import * as synergyModule from './data/synergies.json';


declare global {
  interface Window {
    champions: any;
    keyToMap: any;
    // valToKey: any;
    idToChampion: any;
    useChampion: any;
    synergies: any;
    selected: any;
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
  const [selected, setSelected] = useState(false);
  const [grouped, setGrouped] = useState(false);

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
    selected,
    grouped,
    setActive,
    setSelected,
    setGrouped,
  };
}

// DATA
const data = Object.values((dataModule as any).default) as Champion[];
const synergies = (synergyModule as any).default as SynergyMap;
window.synergies = synergies;

function setChampionData(data) {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const champions: ChampionState[] = data.map(c => useChampion(c));
  const idToChampion = objFromAry(id, champions);
  const keyToMap = jsonToMaps(champions);
  const selected = champions.filter(c => c.selected);

  window.champions = champions;
  window.idToChampion = idToChampion;
  window.keyToMap = keyToMap;
  window.selected = selected;

  return { keyToMap, idToChampion, champions, selected };
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
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [hidden, setHidden] = useState(true);

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
      <button className="checkboxes-toggle" onClick={toggleHidden}>
        Filters
      </button>
    </div>
  );
}

function renderChampionSynergies(champions) {

}

// try constructing inside first, then build outer
function Ariandel() {
  const [config, ConfigEditor] = useConfig(defaultConfig);
  // const [selectedMap, setSelectedMap] = useState({});

  const { champions, keyToMap, idToChampion } = setChampionData(data);

  function onClickNode(id) {
    const champion = idToChampion[id];
    // eslint-disable-next-line react-hooks/rules-of-hooks
    champion.setSelected(!champion.selected);
  }

  const filteredMap = objFromAry(id, champions.filter(c => !c.active));
  console.log('ARIANDEL RENDER');
  const graph = mapsToD3Graph(id, champions, idToChampion, Object.values(keyToMap));
  return (
    <div className="app" style={{height: '100vh', width: '100vw'}}>
      {ConfigEditor}
      {renderKeysAsCheckboxes(keyToMap)}
      <Graph id="graph" data={graph} config={config} onClickNode={onClickNode} />
    </div>
  );
}

export default Ariandel;
