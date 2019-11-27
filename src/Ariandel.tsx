// third party
import React, {
  useState, useEffect, useLayoutEffect, useMemo, cloneElement
} from 'react';
import Modal from 'react-modal';
// import { Graph } from 'react-d3-graph';
// import { Graph, DefaultLink, DefaultNode } from '@vx/network';
import {
  InteractiveForceGraph, ForceGraphNode, ForceGraphLink,ForceGraph
} from 'react-vis-force';
// import { scaleCategory20 } from 'd3-scale';
import cx from 'classnames/bind';
import * as ramda from 'ramda';

// fundamentals
import { objFromAry } from './util';
import { graphConfig } from './config';
import {
  keys, isChampion, Champion, id,
  Synergy, SynergyMap, SynergyTypeMap, SynergyType,
  Item
} from './knowledge/modeldata';
import {
  State, pickStateVars, mergeStateVars,
  SynergyThreshold, Threshold, SynergyEnrichment,
  ItemEnrichment,
  useAppState,
} from './knowledge/modelapp';

// loaders
import {
  mapToReactD3Graph, mapToVxNetwork, mapToReactVisForce
} from './loader/mapsToGraph';
import { jsonToMaps } from './loader/dataToMaps';

// components
import { ChampionList } from './components/ChampionList';
import { SynergyList } from './components/SynergyList';
import { ChampionImages } from './components/ChampionImages';
import { GridNode, GridChartSvg, GridChartHtml } from './components/GridChart';

// styles
import './App.scss';
import './components/GridChart.scss';

// data
// TODO: maybe consolidate into 1 data import?
import * as championModule from './data/champions.json';
import * as synergyModule from './data/synergies.json';
import * as itemModule from './data/items.json';


declare global {
  interface Window {
    champions: any;
    keyToMap: any; // todo rename to relationToMap
    tierToMap: any;
    // valToKey: any;
    idToChampion: any;
    idToItem: any;
    useChampion: any;
    synergies: any;
    keyToSynergy: any;
    selected: any;
    nodes: any;
    combineItems: any;
    recipeToNonBasicItem: any;
    idToResultsGridNode: any;
    R: any
  }
}
declare module 'react' {
  interface HTMLAttributes<T> extends AriaAttributes, DOMAttributes<T> {
    // extends React's HTMLAttributes
    active?: string|boolean|number;
  }
}
var R = ramda;
window.R = ramda;


type EnrichedSynergy = Synergy & SynergyEnrichment;
type EnrichedItem = Item & ItemEnrichment<EnrichedItem>;
type ChampionState = State & Champion;

interface ItemMap {
  [id: string]: Item;
}
interface EnrichedItemMap {
  [id: string]: EnrichedItem;
}
interface EnrichedItemsMap {
  [id: string]: EnrichedItemsMap;
}

// DATA
const championData = Object.values((championModule as any).default) as Champion[];
const synergyData = (synergyModule as any).default as SynergyTypeMap<Synergy>;
const itemData = (itemModule as any).default as ItemMap;

// synergy maps
const keyToSynergy: SynergyTypeMap<EnrichedSynergy> = R.mapObjIndexed(
  R.mapObjIndexed(enrichSynergy),
  synergyData,
);
window.keyToSynergy = keyToSynergy;

// item maps creation, should be "atomic"
const idToItem: EnrichedItemMap = R.mapObjIndexed(prepItem, itemData);
window.idToItem = idToItem;
const items = Object.values(idToItem);
const basicItems = items.filter(item => !item.recipe);
const nonBasicItems = items.filter(item => item.recipe);
const idToNonBasicItem  = objFromAry(id, nonBasicItems);
const recipeToNonBasicItem = R.mergeWith(
  R.merge,
  R.mapObjIndexed(
    R.reduceBy(R.merge, {}, item => item.recipe[1]),
    R.groupBy(item => item.recipe[0], nonBasicItems),
  ),
  R.mapObjIndexed(
    R.reduceBy(R.merge, {}, item => item.recipe[0]),
    R.groupBy(item => item.recipe[1], nonBasicItems),
  ),
);
window.recipeToNonBasicItem = recipeToNonBasicItem;
R.mapObjIndexed(stimulateItem, idToItem); // Fills in enriched items

// Create "empty" enriched item from item
function prepItem(item: Item, name: string): EnrichedItem {
  return { ...item, usedIn: [], madeFrom: [] };
}
// Mutate enriched item to add its specifications
function stimulateItem(item: EnrichedItem, unused: string, idToItem: EnrichedItemMap) {
  if (!item.recipe) return;
  item.madeFrom = item.recipe.map(itemName => idToItem[itemName]);
  item.madeFrom.forEach(m => m.usedIn = [...m.usedIn, item]);
}

// LOADS ITEM TO GRIDCHART
function makeGridNodeFromItem(item: Item): GridNode {
  const {[id]: name, short, effect, icon} = item;

  if (name.length > 9 && short) {
    return {id: name, label: short, data: effect};
  }
  return {id: name, data: effect};
}
interface GridNodeMap {
  [id: string]: GridNode;
}
const gridAxisNodes: GridNode[] = basicItems.map(makeGridNodeFromItem);
const idToResultsGridNode: GridNodeMap =
  R.mapObjIndexed(makeGridNodeFromItem, idToNonBasicItem);
window.idToResultsGridNode = idToResultsGridNode;
function combineItems(itemA: GridNode, itemB: GridNode) {
  return idToResultsGridNode[recipeToNonBasicItem[itemA.id][itemB.id][id]];
}
window.combineItems = combineItems;

interface ThresholdMap {
  [threshold: number]: string;
}

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
  const champions: ChampionState[] = data.map(c => useAppState(c));
  const idToChampion: { [id:string]: ChampionState } = objFromAry(id, champions);
  const keyToMap = jsonToMaps(id, keys, champions);
  const tierToMap = jsonToMaps(id, ['tier'], champions);

  // gathers selected, highlighted, hovered
  const emptyPicks = { selected: [], highlighted: [], hovered: [] };
  const picks = reduceToPicks(emptyPicks, champions);

  window.champions = champions;
  window.idToChampion = idToChampion;
  window.keyToMap = keyToMap;
  window.tierToMap = tierToMap;

  return { keyToMap, tierToMap, idToChampion, champions, ...picks };
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
    walkLeaves(champion => champion.setFiltered(!checked), isLeaf, map[value]);
  }

  const { render, checked } = Object.entries(map[name]).reduce((acc, [k, v]) => {
    if (isLeaf(v)) {
      // acc.render.push(renderObjAsCheckbox(v));
      // eslint-disable-next-line react-hooks/rules-of-hooks
      // acc.render.push(v.render);
      acc.render.push(
        <LabeledCheckbox
          key={v.name}
          label={v.name}
          checked={!v.filtered}
          onChange={e => v.setFiltered(!e.target.checked)}
          className="champion"
        />
      );
      acc.checked = acc.checked && !v.filtered;
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
        className={['checkboxes-container', `depth${depth}`].join(' ')}
      >
        {render}
      </LabeledCheckbox>
    ),
    checked,
  };
}

function ItemReferenceModal() {
  const [open, setOpen] = React.useState(false);

  function openModal() {
    setOpen(true);
  }
  function closeModal() {
    setOpen(false);
  }

  const style = {
    content: {
      left: '50%',
      right: 'unset',
      bottom: 'unset',
      padding: 'unset',
      transform: 'translate(-50%, 0)',
      border: 'unset',
    }
  };

  const nodeStyle = {
  };
  const chartStyle = {
  };

  const renderChart = (
    <GridChartHtml
      x={gridAxisNodes}
      y={gridAxisNodes}
      vertSpace={64}
      horiSpace={150}
      vertGutter={18}
      horiGutter={10}
      operator={combineItems}
      showLabels
      labelClass={"grid-labels"}
      nodeStyle={nodeStyle}
      chartStyle={chartStyle}
    />
  );

  return (
    <div className="reference-modal">
      <button className="panel" onClick={openModal}>Item Reference</button>
      <Modal
        isOpen={open}
        onRequestClose={closeModal}
        style={style}
        ariaHideApp={false}
      >
        <div id="item-grid">
          {renderChart}
        </div>
      </Modal>
    </div>
  )
}

// creates check boxes with objects at leaves, based on a maps of props vals -> objs
function renderKeysAsCheckboxes(keyToMap, name='filters') {
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
    <div className="checkboxes" is={!hidden ? 'active' : null}>
      <button className="checkboxes-toggle panel" onClick={toggleHidden}>
        {name}
      </button>
      <div className="checkboxes-container panel" hidden={hidden}>
        {checkboxes}
      </div>
    </div>
  );
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

function linkDisplayRules(a: State, b: State): Partial<State> {
  return {
    filtered: a.filtered || b.filtered,
    selected: a.selected && b.selected,
    grouped: a.grouped && b.grouped,
    highlighted: (a.highlighted && b.hovered) || (a.hovered && b.highlighted),
    hovered: false,
  };
}

function Ariandel() {
  const start = Date.now();
  // const [config, ConfigEditor] = useConfig(graphConfig);

  const {
    champions, keyToMap, tierToMap, idToChampion, selected, highlighted, hovered
  } = setChampionData(championData);
  const [hoveredChampion] = hovered;

  function toggleSelectChampion(id: string) {
    const champion = idToChampion[id];
    if (champion.filtered) return;
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
    if (champion.filtered) return;
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

  const {nodes, links} = mapToReactVisForce(
      id, champions, Object.values(keyToMap), pickStateVars, linkDisplayRules);
  window.nodes = nodes;
  console.log('ARIANDEL RENDER', Date.now() - start);
  // TODO turn left/right-container to be real presentation components
  return (
    <div className="app" style={{height: '100vh', width: '100vw'}}>
      <div className="left-container">
        {renderKeysAsCheckboxes(tierToMap, 'tier')}
        {renderKeysAsCheckboxes(R.pick(['origin'], keyToMap), 'origin')}
        {renderKeysAsCheckboxes(R.pick(['class'], keyToMap), 'class')}
      </div>
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
         <SynergyList
          className="panel hovered-synergies"
          title={hoveredChampion ? hoveredChampion[id] : 'No Champion'}
          synThreshes={extractSynergyThresholds(hoveredChampion || [])}
        />
      </div>
      <div className="top-container">
        <ItemReferenceModal />
      </div>
      <div id="graph">
        <ForceGraph
          // highlightDependencies
          showLabels
          zoom
          zoomOptions={{
            maxScale: 1,
            minScale: 1,
          }}
          simulationOptions={{
            radiusMargin: 36,
            // strength: { x: -.04, y: -.01 },
            // animate: true,
            alphaDecay: .003, // lower the more grouped
            height: window.innerHeight,
            width: window.innerWidth,
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
          ))}
          <defs>
            <ChampionImages champions={champions} />
          </defs>
        </ForceGraph>
      </div>
    </div>
  );
}

export default Ariandel;
