// third party
import React, { useState, useEffect, useLayoutEffect, useMemo, cloneElement } from 'react';
// import { Graph } from 'react-d3-graph';
// import { Graph, DefaultLink, DefaultNode } from '@vx/network';
import { InteractiveForceGraph, ForceGraphNode, ForceGraphLink, ForceGraph } from 'react-vis-force';
// import { scaleCategory20 } from 'd3-scale';
import cx from 'classnames/bind';
import * as ramda from 'ramda';

// fundamentals
import { objFromAry } from './util';
import { graphConfig } from './config';
import {
  keys, isChampion, Champion, id, Synergy,
  SynergyMap, SynergyTypeMap, SynergyType
} from './knowledge/modeldata';
import { State, pickStateVars, mergeStateVars } from './knowledge/modelapp';

// loaders
import { mapToReactD3Graph, mapToVxNetwork, mapToReactVisForce } from './loader/mapsToGraph';
import { jsonToMaps } from './loader/dataToMaps';

// styles
import './App.scss';

// data
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

type ChampionState = State & Champion;

function useChampion(champion: Champion) {
  const [active, setActive] = useState(true);
  const [selected, setSelected] = useState(false);
  const [grouped, setGrouped] = useState(false);
  const [highlighted, setHighlighted] = useState(false);
  const [hovered, setHovered] = useState(false);

  // use setActive from closure
  function onChange(e) {
    setActive(e.target.checked);
  }

  // TODO move out of useChampion
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
    highlighted,
    hovered,
    setActive,
    setSelected,
    setGrouped,
    setHighlighted,
    setHovered,
  };
}

// Adds stuff to synergy to make it easier to use
type Threshold = [number, string];
interface ThresholdMap {
  [threshold: number]: string;
}

interface SynergyEnrichment extends SynergyThreshold {
  getThresholdStr: (n: number) => Threshold | null;
}
type EnrichedSynergy = Synergy & SynergyEnrichment;

// DATA
const championData = Object.values((championModule as any).default) as Champion[];
const synergyData = (synergyModule as any).default as SynergyTypeMap<Synergy>;

const keyToSynergy: SynergyTypeMap<EnrichedSynergy> =
  R.mapObjIndexed(R.mapObjIndexed(enrichSynergy), synergyData)
window.keyToSynergy = keyToSynergy;

function synergyThreshold(
  posThreshMap: ThresholdMap, exactThreshMap: ThresholdMap, count: number
): Threshold {
  if (exactThreshMap[-count]) {
    return [-count, exactThreshMap[-count]]; // return exacts
  }

  const sortedThresh = R.toPairs(posThreshMap); // should be sorted
  const isThresholdLte = (acc, thresh: Threshold) => R.lte(thresh[0], count);
  const reducedVal = (acc, val) => val;
  return R.reduceWhile(isThresholdLte, reducedVal, null, sortedThresh);
}

function isKeyPositive(val, key) {
  return Number(key) > 0;
}

function isKeyNegative(val, key) {
  return Number(key) < 0;
}

function enrichSynergy(synergy: Synergy, name: string): EnrichedSynergy {
  const posThreshMap: ThresholdMap = R.pickBy(isKeyPositive, synergy);
  const negThreshMap: ThresholdMap = R.pickBy(isKeyNegative, synergy);
  const getThresholdStr = R.curry(synergyThreshold)(posThreshMap, negThreshMap);
  // add threshold
  return {
    ...synergy,
    name,
    threshes: R.concat(R.toPairs(negThreshMap), R.toPairs(posThreshMap)),
    getThresholdStr,
  };
}


const pickReducer = (acc, val) => {
  val.selected && acc.selected.push(val);
  val.highlighted && acc.highlighted.push(val);
  val.hovered && acc.hovered.push(val);
  return acc;
}
const reduceToPicks = R.reduce(pickReducer);
function setChampionData(data) {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const champions: ChampionState[] = data.map(c => useChampion(c));
  const idToChampion: { [id:string]: ChampionState } = objFromAry(id, champions);
  const keyToMap = jsonToMaps(champions);

  const emptyPicks = {
    selected: [],
    highlighted: [],
    hovered: [],
  };
  const picks = reduceToPicks(emptyPicks, champions);

  window.champions = champions;
  window.idToChampion = idToChampion;
  window.keyToMap = keyToMap;

  return { keyToMap, idToChampion, champions, ...picks };
}

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
      <button className="checkboxes-toggle panel" onClick={toggleHidden}>
        Filters
      </button>
    </div>
  );
}

interface SynergyThreshold {
  name: string;
  threshes: Threshold[];
}
const filterNull = R.filter(R.identity);
// Evaluates the thresholds that arise from a set of champions
function evalChampionThresholds(champions: Champion[]): SynergyThreshold[] {
  return Object.entries(keyToSynergy).flatMap(([k, synergyMap]) => {
    const synergies = champions.flatMap(c => c[k]);
    const synergyCountMap = R.countBy(R.identity, synergies);
    const mapCountsToThresholds = R.map(([synName, synCount]) => {
      const foundThresh = synergyMap[synName].getThresholdStr(synCount);
      if (!foundThresh) return;
      return {name: synName, threshes: [foundThresh]};
    });
    return filterNull(mapCountsToThresholds(R.toPairs(synergyCountMap)));
  });
}
function extractSynergyThresholds(champion: Champion): SynergyThreshold[] {
  const keySyns = R.toPairs(R.pick(keys, champion));
  const keySynPaths = R.uniq(R.unnest(R.map(([k,vs]) => R.map(v => [k, v], vs), keySyns)))
  return keySynPaths.map(path => R.path(path, keyToSynergy));
}
interface SynergyListProps {
  title: string;
  className?: string;
  synThreshes: SynergyThreshold[];
}
function SynergyList(props: SynergyListProps) {
  const {synThreshes, title, className} = props;
  const renderThresholds = synThreshes.map(({name, threshes}) => (
    <div key={name} className="synergy">
      <div className="name">{name}</div>
      {threshes.map(([count, threshStr]) => (
        <div key={threshStr} className="flex">
          <div className="threshold">{Math.abs(count)}</div>
          <div className="synergy-detail">{threshStr}</div>
        </div>
      ))}
    </div>
  ));

  return (
    <div className={cx('synergy-list', className)}>
      <div className="title">{title}</div>
      <div className="synergies">{renderThresholds}</div>
    </div>
  );
}

interface ChampionListProps {
  title: string;
  className?: string;
  champions: Champion[];
  onClick?: (championName: string) => void;
}
// Component that shows list of champions
function ChampionList(props: ChampionListProps) {
  const {title, className, champions, onClick} = props;

  function handleOnClick(event: React.MouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLDivElement;
    const championId = target.textContent;
    onClick && onClick(championId);
  }

  const renderChampions = champions.map(c => (
    <div key={c.name} className="champion" onClick={handleOnClick}>
      {c.name}
    </div>
  ));
  return (
    <div className={cx('champion-list', className)}>
      <div className="title">{title} ({champions.length})</div>
      <div className="champions">{renderChampions}</div>
    </div>
  )
}

function attachEvents(child) {
  return cloneElement(child, {
    onMouseDown: () => console.log(`clicked <${child.type.name} />`, child),
    onMouseOver: () => console.log(`hovered <${child.type.name} />`),
    onMouseOut: () => console.log(`blurred <${child.type.name} />`),
  });
}

function linkRules(a: State, b: State): Partial<State> {
  return {
    active: a.active && b.active,
    selected: a.selected && b.selected,
    grouped: a.grouped && b.grouped,
    highlighted: (a.highlighted && b.hovered) || (a.hovered && b.highlighted),
    hovered: false,
  };
}

function Ariandel() {
  const start = Date.now();
  // const [config, ConfigEditor] = useConfig(graphConfig);

  const { champions, keyToMap, idToChampion, selected, highlighted, hovered }
    = setChampionData(championData);

  function toggleSelectChampion(id: string) {
    const champion = idToChampion[id];
    // eslint-disable-next-line react-hooks/rules-of-hooks
    champion.setSelected(!champion.selected);
  }

  function relatedChampions(sourceC: ChampionState): ChampionState[] {
    return R.uniqBy((c: ChampionState) => c[id], keys.flatMap(
      key => sourceC[key].flatMap(
        (syn: string) => Object.values(keyToMap[key][syn])
      )
    ).filter(c => c[id] !== sourceC[id]));
  }

  function setChampionHighlight(id: string, bool: boolean) {
    const champion: ChampionState = idToChampion[id];
    relatedChampions(champion).forEach(c => c.setHighlighted(bool));
    champion.setHovered(bool);
  }

  function attachNodeEvents(node) {
    return cloneElement(node, {
      onMouseDown: () => toggleSelectChampion(node.props.node.id),
      onMouseOver: () => setChampionHighlight(node.props.node.id, true),
      onMouseOut: () => setChampionHighlight(node.props.node.id, false),
    });
  }

  // const graph = mapToReactD3Graph(id, champions, idToChampion, Object.values(keyToMap));
  // const graph = mapToVxNetwork();
  const {nodes, links} = mapToReactVisForce(id, champions, Object.values(keyToMap), pickStateVars, linkRules);
  console.log('ARIANDEL RENDER', Date.now() - start);
  return (
    <div className="app" style={{height: '100vh', width: '100vw'}}>
      {renderKeysAsCheckboxes(keyToMap)}
      <div className="right-container">
        <ChampionList
          className="panel selected-champions"
          title="Selected"
          champions={selected}
          onClick={toggleSelectChampion}
        />
        <SynergyList
          className="panel selected-synergies"
          title="Synergies"
          synThreshes={evalChampionThresholds(selected)}
        />
        <ChampionList
          className="panel highlighted-champions"
          title="Neighbors"
          champions={highlighted}
        />
        {hovered[0] && <SynergyList
          className="panel hovered-synergies"
          title={hovered[0][id]}
          synThreshes={extractSynergyThresholds(hovered[0])}
        />}
      </div>
      <div id="graph">
        <ForceGraph
          highlightDependencies
          showLabels
          simulationOptions={{
            radiusMargin: 40,
            // strength: { x: -.03, y: -.01 },
            // animate: true,
            // alphaDecay: .01,
            height: 900,
            width: 1100,
          }}
        >
          {nodes.map(forceNode => (
            <ForceGraphNode
              key={forceNode.node.id}
              {...forceNode}
            />
          )).map(attachNodeEvents)}
          {links.map(forceLink => (
            <ForceGraphLink
              key={`${forceLink.link.source}=>${forceLink.link.target}`}
              {...forceLink}
            />
          )).map(attachEvents)}
        </ForceGraph>
      </div>
    </div>
  );
}

export default Ariandel;
