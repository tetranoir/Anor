import cx from 'classnames/bind';
import * as R from 'ramda';
import * as ngraph from 'ngraph.graph';

import { NGraphGraph } from '../types/ngraph';

// if false, then hide. if true, then filter
const hideFilter = false;

const NGraph = ngraph as unknown as () => NGraphGraph;

/// EXPORT from react-vis-force to ngraph
export const mapReactVisForceToNGraph = (fLinks: RVF_ForceLink[], graph = NGraph()) => {
  fLinks.forEach(fLink => graph.addLink(fLink.link.source, fLink.link.target));
  return graph;
}

export function encodeStr(s: string) {
  return s.replace(/[\W]/g,'');
}

/// EXPORT to react-vis-force
type HexColor = string;
interface RVF_ForceNode {
  id: string;
  node: RVF_Node;
  cx?: number;
  cy?: number;
  r?: number;
  className?: string;
  labelClass?: string;
  fill?: HexColor|string;
  opacity?: number; // 0 - 1
  stroke?: HexColor|string;
  strokeWidth?: number; // in pixels
  onMouseDown?: (e: MouseEvent) => void;
  onMouseOver?: (e: MouseEvent) => void;
  onMouseOut?: (e: MouseEvent) => void;
}
interface RVF_ForceLink {
  link: RVF_Link,
  edgeOffset?: number;
  strokeWidth?: number;
  className?: string;
  opacity?: number;
  stroke?: HexColor;
  pathLength?: number;
  onMouseDown?: (e: MouseEvent) => void;
  onMouseOver?: (e: MouseEvent) => void;
  onMouseOut?: (e: MouseEvent) => void;
}
interface RVF_Node {
  id: string;
  radius?: number;
}
interface RVF_Link {
  source: string;
  target: string;
  value?: number;
}
type Identifiable<S extends string, T = {}> = Record<S, string> & T & {icon: string};
/**
 * @param id       parameter that exists in T
 * @param objs     List of objects
 * @param maps.....Maps mappings of "Keys" to objects (TODO: deprecate in
 *                 favor of extracting this information from objs)
 * @param nodeProps Function that extracts properties from a T object
 * @param linkPRops Function that extracts properties from 2 T objects
 */
type mapToReactVisForce =
  <S extends string, T, U extends Identifiable<S, T>> (
    id: S,
    objs: U[],
    maps,
    nodeProps: (o: T) => object,
    linkProps: (a: T, b: T) => object,
  ) => { nodes: RVF_ForceNode[], links: RVF_ForceLink[] };
export const mapToReactVisForce: mapToReactVisForce = (id, objs, maps, nodeProps, linkProps) => {
  // creates nodes
  const nodes: RVF_ForceNode[] = objs.map(o => {
    const props = nodeProps(o);
    const rvfNode = {
      id: o[id],
      node: {
        id: o[id],
        radius: 12,
      },
      className: cx('graph-node', props),
      labelClass: cx('node-label', props),
      fill: `url(#${encodeStr(o[id])}-img)`,
      // fill: `url(${o.icon})`,
      // fill: 'url(#myGradient)',
    };
    return rvfNode;
  });

 // creates links
  const hist = {}; // (hist)ory of links made
  // the extra arrays are to influence draw order
  const links: RVF_ForceLink[] = [];
  const sLinks: RVF_ForceLink[] = [];
  const hLinks: RVF_ForceLink[] = [];
  maps.forEach(map => {
    Object.entries(map).forEach(([synergy, objMaps]) => {
      // TODO, this is clearly bad, should instead find and hide links between
      // synergies with only a thresh of 1
      if (synergy === "Avatar") {
        return;
      }
      const objs = Object.values(objMaps);
      for (let i = 0; i < objs.length - 1; i++) {
        const src = objs[i];
        const source: string = src[id];
        if (!hist[source]) {
          hist[source] = {};
        }
        for (let j = i + 1; j < objs.length; j++) {
          const tgt = objs[j];
          const target: string = tgt[id];
          if (hist[source][target]) continue; // drop dup links

          const lProps = linkProps(src, tgt);
          const rvfLink: RVF_ForceLink = {
            link: { source, target, value: 4 },
            className: cx('graph-link', lProps),
          };

          // TODO, shouldnt expose highlight and selected
          const __unsafe_lProps = lProps as any;
          // const linksPtr =
          //   __unsafe_lProps.highlighted ? hLinks :
          //     __unsafe_lProps.selected ? sLinks : links;
          const linksPtr = links;

          linksPtr.push(rvfLink);
          hist[source][target] = rvfLink; // record link
        }
      }
    });
  });

  return { nodes, links: links.concat(sLinks).concat(hLinks) };
}

/// EXPORT TO vx/network
export function mapToVxNetwork() {

}


/// EXPORT TO react-d3-graph
function setNodeAsSelected(node) {
  node.color = 'lightgreen';
  // node.strokeColor = 'forestgreen';
  node.highlightStrokeColor = 'forestgreen';
  node.fontSize = 20;
  node.highlightFontSize = 40;
}

export function mapToReactD3Graph(id, objs, allObjMap, maps) {
  let nodes;
  if (hideFilter) {
    nodes = objs.filter(o => o.active)
  }
  nodes = nodes.map(o => {
    const node = {
      ...o,
      id: o[id],
      opacity: o.active ? 1 : 0.3,
    };
    if (o.selected) {
      setNodeAsSelected(node);
    }
    return node;
  });

  const hist = {};

  const links = maps.reduce((lks, map) => {
    Object.values(map).forEach(objMaps => {
      const objs = Object.values(objMaps);
      for (let i = 0; i < objs.length - 1; i++) {
        const source = objs[i][id];
        if (!hist[source]) {
          hist[source] = {};
        }
        for (let j = i + 1; j < objs.length; j++) {
          const target = objs[j][id];
          if (hist[source][target]) continue;
          const link = { source, target, opacity: 1 };
          if (!allObjMap[target].active || !allObjMap[source].active) {
            if (hideFilter) {
              continue;
            }
            link.opacity = 0.3;
          }
          lks.push(link);
          hist[source][target] = link;
        }
      }
    });
    return lks;
  }, []);

  if (nodes.length === 0) {
    nodes.push({id: '???'});
  }

  return { nodes, links };
}
