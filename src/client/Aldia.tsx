// v5
// third party
import React, {
  useState, useEffect, useLayoutEffect, useMemo, cloneElement
} from 'react';
import Modal from 'react-modal';
import {
  InteractiveForceGraph, ForceGraphNode, ForceGraphLink,ForceGraph
} from 'react-vis-force';
import cx from 'classnames/bind';
import * as R from 'ramda';
import * as S from 'sanctuary';
import * as Centrality from 'ngraph.centrality';
import * as NGraph from 'ngraph.graph';
import * as d3 from 'd3';
import {
  NavigationView, SplitViewCommand, Button, AppBarButton, CommandBar,
  AppBarSeparator, FloatNav, SplitView, SplitViewPane, ListView, Separator,
  TextBox, IconButton, Flyout, FlyoutContent
} from 'react-uwp';

// fundamentals
import { index, prop } from '../utils';
import { multiKeyToIX, counter } from '../utils/object.utils';
import { graphConfig } from './config';
import {
  keys, isChampion, Champion, id,
  Synergy, SynergyMap, SynergyTypeMap, SynergyType,
  Item,
} from '../models/data.models';
import {
  ClientState, pickStateVars, mergeStateVars,
  SynergyEnrichment,
  ItemEnrichment, ChampionEnrichment,
  useClientState,
} from '../models/client.models';

// loaders
import {
  mapToReactD3Graph, mapToVxNetwork, mapToReactVisForce,
  mapReactVisForceToNGraph,
} from './loaders/mapsToGraph';
import { jsonToMaps } from './loaders/dataToMaps';

// components
import { ChampionList } from '../components/ChampionList';
import { SynergyList } from '../components/SynergyList';
import { ChampionImages } from '../components/ChampionImages';
import { GridNode, GridChartHtml } from '../components/GridChart';

// utility types
import { NGraphGraph, CentralityMode } from '../types/ngraph';

// styles
import './App.scss';
import '../components/GridChart.scss';

// data
import * as championsjson from '../data/v3/champions.json';
import * as synergiesjson from '../data/v3/synergies.json';


// DECLARATIONS
declare global {
  interface Window {
    [s: string]: any;
  }
}
declare module 'react' {
  interface HTMLAttributes<T> extends AriaAttributes, DOMAttributes<T> {
    // extends React's HTMLAttributes
    active?: string|boolean|number;
  }
}

// WINDOW GLOBALS
window.R = R;
window.S = S;
window.d3 = d3;

// TYPES
// type EnrichedSynergy = Synergy & SynergyEnrichment;

/**
 * Naming Convention!
 *   The more important name goes last (like in English)
 *   If it includes the principle object, [modifier][principle name]
 *   If it only includes modifiers,       [principle name][modifier]
 */
// Augments Champions
type ChampionAugment = ClientState & ChampionEnrichment;
// Incomplete ClientChampion
type IncClientChampion = Champion & Partial<ChampionAugment>;
// Champion structure that the client uses
type ClientChampion = Champion & ChampionAugment;

type IncClientSynergy = Synergy & Partial<SynergyEnrichment>;

type ClientSynergy = Synergy & SynergyEnrichment;

// GRAPH STUFF
// const centralityModes: CentralityMode[] = [
//   'eccentricity',
//   'degree',
//   'closeness',
//   'betweenness',
// ];
// const graphColors = d3.scaleSequential(d3.interpolateTurbo);

const rawChampions = (championsjson as any).default as Champion[];
const rawSynergies = (synergiesjson as any).default as Synergy[];

const cssColorFilter = {
  gold: 'sepia(100%) hue-rotate(14deg) saturate(7)',
  silver: 'sepia(100%) hue-rotate(180deg) saturate(.8) brightness(1.3)',
  bronze: 'sepia(100%) saturate(4) brightness(0.5)',
  undefined: 'contrast(0.2) brightness(2) invert(1)',
};

// Gets shortname from name
function getShortName(o: {name: string}) {
  const {name} = o;
  return name.replace(/[\W]/g,'').toLowerCase();
}

// Gets straits from class and origin
function getTraits(o: {origin: string[], class: string[]}) {
  return o.class.concat(o.origin);
}

function linkDisplayRules(a: ClientState, b: ClientState):
    Partial<ClientState> {
  return {
    filtered: a.filtered || b.filtered,
    selected: a.selected && b.selected,
    grouped: a.grouped && b.grouped,
    highlighted: (a.highlighted && b.hovered) || (a.hovered && b.highlighted),
    hovered: false,
  };
}

// picks some champion attrs from val and stores in array if exists
const pickReducer = (acc, val) => {
  val.selected && acc.selected.push(val);
  val.highlighted && acc.highlighted.push(val);
  val.hovered && acc.hovered.push(val);
  return acc;
}
const reduceToPicks = R.reduce(pickReducer);
// Aldia & indexes
/**
 * Single instance of objects that will be mutated throughout the app to keep
 * allow for one time indexing.
 */
const incChampions: IncClientChampion[] = R.clone(rawChampions);
const incSynergies: IncClientSynergy[] = R.clone(rawSynergies);

function Aldia() {
  // Benchmarking
  const start = Date.now();

  // Create ClientChampion from IncClientChampion
  const champions: ClientChampion[] = R.map(
    (c: IncClientChampion) => Object.assign(c, {
      short: getShortName(c),
      traits: getTraits(c),
      // eslint-disable-next-line react-hooks/rules-of-hooks
      ...useClientState(prop('name')(c)),
    }),
    incChampions,
  );
  window.champions = champions;

  const emptyPicks = { selected: [], highlighted: [], hovered: [] };
  const {
    selected,
    highlighted,
    hovered
  }:{
    selected: ClientChampion[],
    highlighted: ClientChampion[],
    hovered: ClientChampion[]
  } = reduceToPicks(emptyPicks, champions);

  const synsCount = selected.flatMap(c => c.traits).reduce(counter, {});
  const synergies: ClientSynergy[] = R.map(
    (s: IncClientSynergy) => Object.assign(s, {
      count: synsCount[s.name],
      countThreshIdx: s.thresholds.reduce((threshIdx, thresh, i) => {
        if (synsCount[s.name] >= thresh.min
            && synsCount[s.name] <= (thresh?.max || Infinity)) {
          return i;
        }
        return threshIdx;
      }, -1),
    }),
    incSynergies,
  );
  // need a pick for synergies too
  const selectedSynergies = R.sort(R.descend(prop('count')),
      synergies.filter(s => s.count > 0));
  window.selectedSynergies = selectedSynergies;


  // NEEDS TO GET INDEXED
  const championsByTrait = multiKeyToIX<ClientChampion>(champions,
      prop('traits'));

  // Champion functionality
  function toggleSelectChampion(name: string) {
    const champion = index(champions, prop('name'))[name];
    if (champion.filtered) {
      champion.setSelected(false);
      return;
    };
    // eslint-disable-next-line react-hooks/rules-of-hooks
    champion.setSelected(!champion.selected);
  }

  function relatedChampions(sourceC: ClientChampion): ClientChampion[] {
    // Lift concat and to accept list of list of champions
    const traitChampions = R.flatten(
        R.map(t => championsByTrait[t], sourceC.traits));
    const uniqTraitChampions = R.uniq(traitChampions);
    const noSourceChampions = R.filter(
        c => c.name !== sourceC.name, uniqTraitChampions);
    return noSourceChampions;
  }

  function setRelatedChampionHighlight(name: string, bool: boolean) {
    const champion: ClientChampion = index(champions, prop('name'))[name];
    if (champion.filtered) return;
    relatedChampions(champion).forEach(c => c.setHighlighted(bool));
  }

  function setChampionHovered(name: string, bool: boolean) {
    const champion: ClientChampion = index(champions, prop('name'))[name];
    if (champion.filtered) return;
    champion.setHovered(bool);
  }

  const [hoverXY, setHoverXY] = useState<[number, number]|undefined>(undefined);
  const [hoveredChampionId, setHoveredChampionId] = useState<string|undefined>(undefined);
  const [hovering, setHovering] = useState(false);

  function resetHover() {
    if (hovering) return;
    hoveredChampionId && setChampionHovered(hoveredChampionId, false);
    setHoverXY(undefined);
    setHoveredChampionId(undefined);
  }

  function attachNodeEvents(node) {
    const {id} = node.props.node;
    return cloneElement(node, {
      onMouseDown: () => toggleSelectChampion(id),
      onMouseOver: e => {
        // unset previous hovered
        hoveredChampionId && setChampionHovered(hoveredChampionId, false);

        setHovering(true);
        setRelatedChampionHighlight(id, true)
        // set new hovered
        setHoveredChampionId(id);
        setChampionHovered(id, true);
        // move tooltip
        const rect = e.currentTarget.getBoundingClientRect();
        setHoverXY([rect.right, rect.top]);
      },
      onMouseOut: () => {
        // Turn this on/off for sticky hovering
        hoveredChampionId && setChampionHovered(hoveredChampionId, false);

        setHovering(false);
        setRelatedChampionHighlight(id, false);
      },
    });
  }

  // Create nodes and links for react force graph
  const {nodes, links} = mapToReactVisForce(
    'name',
    champions,
    // cant use index() for this because the key fn would need to return list
    Object.values(jsonToMaps(id, keys, champions)),
    R.pipe(pickStateVars),
    linkDisplayRules
  );

  // Attach to window for introspection
  window.nodes = nodes;
  window.links = links;

  // Attach functionality to nodes
  const renderedNodes = R.map(R.pipe(
    forceNode => (<ForceGraphNode key={forceNode.node.id} {...forceNode} />),
    attachNodeEvents,
  ), nodes);

  const baseStyle: React.CSSProperties = {
    height: '-webkit-fill-available',
  };

  const navigationTopNodes = [
    <SplitViewCommand icon="VPN" label="Graph" />,
    <SplitViewCommand icon="BarcodeScanner" label="Items" />,
    <SplitViewCommand icon="People" label="Team" />,
  ];

  // Benchmarking
  process.env.NODE_ENV !== 'production'
      && console.log('ALDIA RENDER', Date.now() - start);
  return (
    <div className="app" onMouseDown={resetHover}>
      <div className="top-bar">
        <CommandBar
          labelPosition="right"
          primaryCommands={[
            <AppBarButton icon="Filter" label="Class" />,
            <AppBarButton icon="Filter" label="Origin" />,
            <AppBarButton icon="Filter" label="Tier" />,
            <AppBarSeparator />,
            <AppBarButton icon="CircleRing" label="Centrality" />,
          ]}
          style={{}}
        />
      </div>
      <div className="left-bar">
        <NavigationView
          style={{height: '-webkit-fill-available'}}
          pageTitle="TFT Set 3"
          displayMode="overlay"
          autoResize={false}
          initWidth={48}
          defaultExpanded
          expandedWidth={160}
          navigationTopNodes={navigationTopNodes}
          focusNavigationNodeIndex={0}
        />
      </div>
      <div className="right-panel">
        <ListView
          listSource={[
            {
              itemNode: <h3>Champions ({selected.length})</h3>,
              style: {padding: '8px'},
            },
            {
              itemNode: <Separator />,
              disabled: true,
            },
            ...selected.map(c => ({
              itemNode: <>
                <IconButton
                  size={25}
                  style={{opacity: 0.3}}
                  hoverStyle={{opacity: 1, color: '#EBD45D'}}
                  onClick={() => toggleSelectChampion(c.name)}
                >
                  Clear
                </IconButton>
                <span>
                  {c.traits.map(t =>
                    <img
                      key={t}
                      style={{height: '24px'}}
                      src={index(synergies, prop('name'))[t].icon}
                      title={t}
                    />)}
                </span>
                <h4 style={{marginLeft: 'auto'}}>{c.name}</h4>
              </>,
            })),
            {
              itemNode: ' ',
              disabled: true,
              style: {height: '8px'},
            },
          ]}
          style={{padding: 0, width: '260px'}}
          listItemStyle={{padding: '0 8px', display: 'flex', alignItems: 'center'}}
        />
        <ListView
          listSource={[
            {
              itemNode: <h3>Synergies</h3>,
              style: {padding: '8px'},
            },
            {
              itemNode: <Separator />,
              disabled: true,
            },
            ...selectedSynergies.map(s => ({
              itemNode: <>
                <img
                  style={{height: '40px', filter: cssColorFilter[s.thresholds[s.countThreshIdx]?.style]}}
                  src={index(synergies, prop('name'))[s.name].icon}
                  title={s.name}
                />
                <h3 style={{margin: '0 8px 0 4px'}}>{s.count}</h3>
                <p style={{opacity: 0.4}}>{s.thresholds.map(t => t.min).join(' ')}</p>
                <h4 style={{marginLeft: 'auto'}}>{s.name}</h4>
              </>,
            })),
            {
              itemNode: ' ',
              disabled: true,
              style: {height: '8px'},
            },
          ]}
          style={{padding: 0, width: '260px'}}
          listItemStyle={{padding: '0 8px', display: 'flex', alignItems: 'center'}}
        />
      </div>
      {hoverXY && hovered[0] &&
        <ListView
          listSource={[
            {
              itemNode: <h3>{hovered[0].name}</h3>,
              style: {padding: '8px'},
            },
            {
              itemNode: <Separator />,
              disabled: true,
            },
            {
              itemNode: <>
                <p style={{paddingRight: '8px'}}>Class:</p>
                <h4>{hovered[0].class.join(' ')}</h4>
              </>
            },
            {
              itemNode: <>
                <p style={{paddingRight: '8px'}}>Origin:</p>
                <h4>{hovered[0].origin.join(' ')}</h4>
              </>
            },
            {
              itemNode: <>
                <p style={{paddingRight: '8px'}}>Cost:</p>
                <h4>{hovered[0].cost}</h4>
              </>
            },
            {
              itemNode: ' ',
              disabled: true,
              style: {height: '8px'},
            },
          ]}
          style={{
            padding: 0,
            width: '160px',
            zIndex: 1,
            position: 'absolute',
            left: `${hoverXY[0] + 8}px`, // x
            top: `${hoverXY[1] - 20}px`, // y
          }}
          listItemStyle={{padding: '0 8px', display: 'flex', alignItems: 'center'}}
        />
      }
      <div id="graph">
       <ForceGraph
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
    </div>
  );
}

export default Aldia;
