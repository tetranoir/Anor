// third party
import React, {
  useState, useEffect, useLayoutEffect, useMemo, cloneElement
} from 'react';
import { useQueryParam, NumberParam, StringParam, BooleanParam } from 'use-query-params';
import Modal from 'react-modal';
// import { Graph } from 'react-d3-graph';
// import { Graph, DefaultLink, DefaultNode } from '@vx/network';
import {
  InteractiveForceGraph, ForceGraphNode, ForceGraphLink,ForceGraph
} from 'react-vis-force';
// import { scaleCategory20 } from 'd3-scale';
import cx from 'classnames/bind';
import * as R from 'ramda';
import * as S from 'sanctuary';
import * as Centrality from 'ngraph.centrality';
import * as NGraph from 'ngraph.graph';
import * as d3 from 'd3';

// fundamentals
import { objFromAry } from './util';
import { graphConfig } from './config';
import {
  keys, isChampion, Champion, id,
  Synergy, SynergyMap, SynergyTypeMap, SynergyType,
  Item,
} from './knowledge/modeldata';
import {
  State, pickStateVars, mergeStateVars,
  SynergyThreshold, Threshold, SynergyEnrichment,
  ItemEnrichment, ChampionEnrichment,
  useAppState,
} from './knowledge/modelapp';

// loaders
import {
  mapToReactD3Graph, mapToVxNetwork, mapToReactVisForce,
  mapReactVisForceToNGraph,
} from './loader/mapsToGraph';
import { jsonToMaps } from './loader/dataToMaps';

// components
import { ChampionList } from './components/ChampionList';
import { SynergyList } from './components/SynergyList';
import { ChampionImages } from './components/ChampionImages';
import { GridNode, GridChartHtml } from './components/GridChart';

// utility types
import { NGraphGraph, CentralityMode } from './types/ngraph';

// styles
import './App.scss';
import './components/GridChart.scss';

// data
// TODO: maybe consolidate into 1 data import?
import * as championModule from './data/champions.json';
import * as synergyModule from './data/synergies.json';
import * as itemModule from './data/items.json';
import * as metaModule from './data/meta.json';


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
    links: any;
    combineItems: any;
    recipeToNonBasicItem: any;
    idToResultsGridNode: any;
    Centrality: any;
    NGraph: any;
    ngraph: any;
    R: any;
    S: any;
    d3: any;
    domainColors: any;
    analysis: any;
  }
}
declare module 'react' {
  interface HTMLAttributes<T> extends AriaAttributes, DOMAttributes<T> {
    // extends React's HTMLAttributes
    active?: string|boolean|number;
  }
}
window.R = R;
window.S = S;
window.d3 = d3;


type EnrichedSynergy = Synergy & SynergyEnrichment;
type EnrichedItem = Item & ItemEnrichment<EnrichedItem>;
type ChampionState = State & Champion & ChampionEnrichment;

const centralityModes: CentralityMode[] = ['eccentricity', 'degree', 'closeness', 'betweenness'];
const graphColors = d3.scaleSequential(d3.interpolateTurbo);

interface ItemMap {
  [id: string]: Item;
}
interface EnrichedItemMap {
  [id: string]: EnrichedItem;
}
interface EnrichedItemsMap {
  [id: string]: EnrichedItemsMap;
}

interface MetaConfig {
  patch: string;
  patch_links: string[];
}

// DATA
const rawChampionData = Object.values((championModule as any).default) as Champion[];
const synergyData = (synergyModule as any).default as SynergyTypeMap<Synergy>;
const itemData = (itemModule as any).default as ItemMap;
const metaConfig = (metaModule as any).default as MetaConfig;

const championData: (Champion & ChampionEnrichment)[] = rawChampionData.map(c => ({
  ...c,
  short: c[id].replace(/[\W]/g,'').toLowerCase(),
}));

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

  const node: GridNode = {id: name, data: effect};

  if (name.length > 9 && short) {
    node.label = short;
  }

  // todo abstract node-data creation to gridchart
  if (icon) {
    node.element = (
      <div className="node-data" title={name}>
        <img src={icon} />
        {node.data}
      </div>
    );
  }

  return node;
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

// CHAMPION DATA
const pickReducer = (acc, val) => {
  val.selected && acc.selected.push(val);
  val.highlighted && acc.highlighted.push(val);
  val.hovered && acc.hovered.push(val);
  return acc;
}
const reduceToPicks = R.reduce(pickReducer);
function setChampionData(data) {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const champions: ChampionState[] = data.map(c => useAppState(c, c.short));
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

// CHECKBOX FUNCTIONS
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

// ITEM MODAL
interface ItemReferenceModalProps {
  basicItems: GridNode[];
  combineItems: (a: GridNode, b: GridNode) => GridNode;
}
function ItemReferenceModal(props: ItemReferenceModalProps) {
  const {basicItems, combineItems} = props;
  const [open, setOpen] = React.useState(false);

  function openModal() {
    setOpen(true);
  }
  function closeModal() {
    setOpen(false);
  }

  const style = {
    content: {
      top: 'unset',
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
      x={basicItems}
      y={basicItems}
      vertSpace={Math.floor(window.innerHeight * .98 / (basicItems.length + 1)) - 20}
      horiSpace={Math.floor(window.innerWidth * .98 / (basicItems.length + 1)) - 4}
      vertGutter={20}
      horiGutter={4}
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

interface InputIOProps {
  prompt: string;
  fn: Function;
}
function InputIO(props: InputIOProps) {
  const { prompt, fn } = props;
  const [value, setValue] = useState('');

  function handleChange(event) {
    setValue(event.target.value);
  }

  function handleSubmit(event) {
    fn(value);
    setValue('');
    event.preventDefault();
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>
        {prompt}
        <input type="text" value={value} onChange={handleChange} />
      </label>
      <input type="submit" value="Enter" />
    </form>
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

interface ExclusiveOptionsProps {
  className?: string;
  title: string;
  options: string[];
  selected: string;
  onClick: (op: string) => void;
}
function ExclusiveOptions(props: ExclusiveOptionsProps) {
   const {options, title, onClick, className, selected} = props;

  const renderOptions = options.map(op => (
    <div
      key={op}
      className={cx('option', {selected: op === selected})}
      onClick={() => onClick(op)}
    >
      {op}
    </div>
  ));

  return (
    <div className={cx('exclusive-options', className)}>
      <div className="title">{title}</div>
      <div className="options">{renderOptions}</div>
    </div>
  )
}

interface NodeAnalysis {
  [node: string]: number;
}
function applyCentrality<T extends {id: string}>(
  links, nodes: T[], mode: CentralityMode,
): T[] {
  const graph = mapReactVisForceToNGraph(links); // todo: add filter to links
  window.ngraph = graph;
  if (mode === 'eccentricity') {
    const analysis: NodeAnalysis = Centrality.eccentricity(graph);
    const aValues = Object.values(analysis);
    const max = Math.max(...aValues);
    const min = Math.min(...aValues);
    const domainColors = graphColors.domain([max, min]); // lower the better
    window.domainColors = domainColors;
    window.analysis = analysis;
    return nodes.map(n => R.merge(n, {style: {stroke: domainColors(analysis[n.id])}}));
  } else if (mode === 'degree') {
    const analysis: NodeAnalysis = Centrality.degree(graph);
    const aValues = Object.values(analysis);
    const max = Math.max(...aValues);
    const min = Math.min(...aValues);
    const domainColors = graphColors.domain([min, max]); // higher the better
    window.domainColors = domainColors;
    window.analysis = analysis;
    return nodes.map(n => R.merge(n, {style: {stroke: domainColors(analysis[n.id])}}));
  } else if (mode === 'closeness') {
    const analysis: NodeAnalysis = Centrality.closeness(graph);
    const aValues = Object.values(analysis);
    const max = Math.max(...aValues);
    const min = Math.min(...aValues);
    const domainColors = graphColors.domain([min, max]); // higher the better
    window.domainColors = domainColors;
    window.analysis = analysis;
    return nodes.map(n => R.merge(n, {style: {stroke: domainColors(analysis[n.id])}}));
  } else if (mode === 'betweenness') {
    const analysis: NodeAnalysis = Centrality.betweenness(graph);
    const aValues = Object.values(analysis);
    const max = Math.max(...aValues);
    const min = Math.min(...aValues);
    const domainColors = graphColors.domain([max, min]); // higher the better
    window.domainColors = domainColors;
    window.analysis = analysis;
    return nodes.map(n => R.merge(n, {style: {stroke: domainColors(analysis[n.id])}}));
  }
  return nodes; // todo: throw?
}

function Ariandel() {
  const start = Date.now();
  // const [config, ConfigEditor] = useConfig(graphConfig);

  const {
    champions, keyToMap, tierToMap, idToChampion, selected, highlighted, hovered
  } = setChampionData(championData);
  const [hoveredChampion] = hovered;

  const [centralityMode, setCentralityMode] = useState<CentralityMode|null>(null);

  function selectChampionsFromString(str: string) {
    const tokens = str.split(/[^a-zA-Z]/).filter(s => s).map(s => s.toLowerCase());
    champions.forEach(c => {
      const cid = c[id].toLowerCase();
      tokens.forEach(tok => {
        if (cid.includes(tok) || tok.includes(cid)) {
          c.setSelected(true);
        }
      });
    });
  }

  function toggleSelectChampion(id: string) {
    const champion = idToChampion[id];
    if (champion.filtered) {
      champion.setSelected(false);
      return;
    };
    // eslint-disable-next-line react-hooks/rules-of-hooks
    champion.setSelected(!champion.selected);
  }

  function setOrToggleCentrality(op: CentralityMode) {
    if (op === centralityMode) {
      setCentralityMode(null);
    } else {
      setCentralityMode(op);
    }
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
  window.links = links;
  const maybeMode = centralityMode ? S.Just(centralityMode) : S.Maybe.Nothing;
  const maybeAnalyzedNodes = R.map(mode => applyCentrality(links, nodes, mode), maybeMode);
  const renderedNodes = R.map(R.pipe(
    forceNode => (<ForceGraphNode key={forceNode.node.id} {...forceNode} />),
    attachNodeEvents,
  ), S.fromMaybe(nodes)(maybeAnalyzedNodes));

  // Benchmarking
  process.env.NODE_ENV !== 'production' && console.log('ARIANDEL RENDER', Date.now() - start);
  // TODO turn left/right-container to be real presentation components
  return (
    <div className="app">
      <div className="left-container">
        {renderKeysAsCheckboxes(tierToMap, 'tier')}
        {renderKeysAsCheckboxes(R.pick(['origin'], keyToMap), 'origin')}
        {renderKeysAsCheckboxes(R.pick(['class'], keyToMap), 'class')}
        <ExclusiveOptions
          className="panel"
          title="apply centrality"
          options={centralityModes}
          selected={centralityMode}
          onClick={setOrToggleCentrality}
        />
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
      </div>
      <div className="right-container offset1">
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
        <div className="panel select-io">
          <InputIO
            prompt="Select:"
            fn={selectChampionsFromString}
          />
        </div>
        <ItemReferenceModal
          basicItems={gridAxisNodes}
          combineItems={combineItems}
        />
      </div>
      <div id="graph" className={cx({analyze: S.isJust(maybeAnalyzedNodes)})}>
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
          {renderedNodes}
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
      <div className="bottom-container">
        patch: {metaConfig.patch}
      </div>
    </div>
  );
}

export default Ariandel;
