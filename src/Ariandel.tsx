import React, { useState, useEffect, useLayoutEffect, useMemo } from 'react';
import { Graph } from 'react-d3-graph';
import cx from 'classnames/bind';
import * as ramda from 'ramda';

import { objFromAry } from './util';
import { defaultConfig } from './config';
import { keys, isChampion, Champion, id, Synergy, SynergyMap,
  SynergyTypeMap, SynergyType } from './knowledge/modeldata';

import { mapsToD3Graph } from './loader/mapsToGraph';
import { jsonToMaps } from './loader/dataToMaps';
import './App.scss';

// TODO: maybe consolidate into 1 data import?
import * as championModule from './data/champions.json';
import * as synergyModule from './data/synergies.json';


declare global {
  interface Window {
    champions: any;
    keyToMap: any;
    // valToKey: any;
    idToChampion: any;
    useChampion: any;
    synergies: any;
    keyToSynergy: any;
    selected: any;
    R: any
  }
}
var R = ramda;
window.R = ramda;

interface State {
  active: boolean;
  selected: boolean;
  grouped: boolean;
  setActive: (boolean) => void;
  setSelected: (boolean) => void;
  setGrouped: (boolean) => void;
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

// Adds stuff to synergy to make it easier to use
type Threshold = [number, string];
interface ThresholdMap {
  [threshold: number]: string;
}

interface SynergyEnrichment {
  getThresholdStr: (n: number) => string | null;
}
type EnrichedSynergy = Synergy & SynergyEnrichment;

// DATA
const championData = Object.values((championModule as any).default) as Champion[];
const synergyData = (synergyModule as any).default as SynergyTypeMap<Synergy>;

const keyToSynergy: SynergyTypeMap<EnrichedSynergy> =
  R.mapObjIndexed(R.mapObjIndexed(enrichSynergy), synergyData)
window.keyToSynergy = keyToSynergy;

function synergyThreshold(threshMap: ThresholdMap, count: number): Threshold {
  if (threshMap[-count]) {
    return [-count, threshMap[-count]]; // return exacts
  }

  const sortedThresh = R.toPairs(threshMap); // should be sorted
  const isThresholdLte = (acc, thresh: Threshold) => R.lte(thresh[0], count);
  const reducedVal = (acc, val) => val;
  return R.reduceWhile(isThresholdLte, reducedVal, null, sortedThresh);
}

function isKeyInteger(val, key) {
  return Number.isInteger(Number(key));
}

function enrichSynergy(synergy: Synergy, synergyName: string): EnrichedSynergy {
  const threshMap: ThresholdMap = R.pickBy(isKeyInteger, synergy);
  const getThresholdStr = R.curry(synergyThreshold)(threshMap);
  // add threshold
  return {
    ...synergy,
    getThresholdStr,
  };
}

function setChampionData(data) {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const champions: ChampionState[] = data.map(c => useChampion(c));
  const idToChampion = objFromAry(id, champions);
  const keyToMap = jsonToMaps(champions);
  const selected = champions.filter(c => c.selected);
  // const filteredMap = objFromAry(id, champions.filter(c => !c.active));

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

interface RenderMapAsCheckboxes {
  render: React.ReactElement;
  checked: boolean;
}
// return render: list of inputs
function renderMapAsCheckboxes(name, map, depth=0): RenderMapAsCheckboxes {
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

const filterNull = R.filter(R.identity);
function ChampionSynergies(props) {
  const {champions, title, className} = props;

  const thresholds: Threshold[] = Object.entries(keyToSynergy).flatMap(([k, synergyMap]) => {
    const synergies = champions.flatMap(c => c[k]);
    const synergyCountMap = R.countBy(R.identity, synergies);
    const mapCountsToThresholds = R.map(([synStr, synCount]) =>
      synergyMap[synStr].getThresholdStr(synCount)
    );
    return filterNull(mapCountsToThresholds(R.toPairs(synergyCountMap)));
  });

  const renderThresholds = thresholds.map(th => (
    <div key={th[1]} className="synergy">
      <div className="threshold">{th[0]}</div>
      <div className="synergy-detail">{th[1]}</div>
    </div>
  ));

  return (
    <div className={cx('champion-synergies', className)}>
      <div className="title">{title}</div>
      <div className="synergies">{renderThresholds}</div>
    </div>
  );
}

interface ChampionListProps {
  title: string;
  className?: string;
  champions: Champion[];
}
// Component that shows list of champions
function ChampionList(props: ChampionListProps) {
  const {title, className, champions} = props;
  const renderChampions = champions.map(c => (
    <div key={c.name} className="champion">
      {c.name}
    </div>
  ));
  return (
    <div className={cx('champion-list', className)}>
      <div className="title">{title}</div>
      <div className="champions">{renderChampions}</div>
    </div>
  )
}

function Ariandel() {
  const start = Date.now();
  const [config, ConfigEditor] = useConfig(defaultConfig);

  const { champions, keyToMap, idToChampion, selected } = setChampionData(championData);

  function onClickNode(id) {
    const champion = idToChampion[id];
    // eslint-disable-next-line react-hooks/rules-of-hooks
    champion.setSelected(!champion.selected);
  }

  const graph = mapsToD3Graph(id, champions, idToChampion, Object.values(keyToMap));
  console.log('ARIANDEL RENDER', Date.now() - start);
  return (
    <div className="app" style={{height: '100vh', width: '100vw'}}>
      {ConfigEditor}
      {renderKeysAsCheckboxes(keyToMap)}
      <ChampionList className="selected-champions" title="Selected" champions={selected} />
      <ChampionSynergies className="selected-synergies" title="Synergies" champions={selected} />
      <Graph id="graph" data={graph} config={config} onClickNode={onClickNode} />
    </div>
  );
}

export default Ariandel;
