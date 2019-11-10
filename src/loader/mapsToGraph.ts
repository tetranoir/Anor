import { State } from '../knowledge/modelapp';
import cx from 'classnames/bind';
import * as R from 'ramda';

// if false, then hide. if true, then filter
const hideFilter = false;

/// EXPORT to react-vis-force
type HexColor = string;
interface RVF_ForceNode {
  node: RVF_Node;
  cx?: number;
  cy?: number;
  r?: number;
  className?: string;
  labelClass?: string;
  fill?: HexColor;
  opacity?: number; // 0 - 1
  stroke?: HexColor;
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
type Identifiable<T extends string, U = {}> = Record<T, string> & U;
/**
 * @param id       parameter that exists in T
 * @param objs     List of objects
 * @param maps.....Maps mappings of "Keys" to objects (TODO: deprecate in
 *                 favor of extracting this information from objs)
 * @param nodeProps Function that extracts properties from a T object
 */
type mapToReactVisForce =
  <T extends string, S, U extends Identifiable<T, S>>(
    id: T,
    objs: U[],
    maps,
    nodeProps: (o: S) => object,
  ) => { nodes: RVF_ForceNode[], links: RVF_ForceLink[] };
export const mapToReactVisForce: mapToReactVisForce = (id, objs, maps, nodeProps) => {
  const nodes: RVF_ForceNode[] = objs.map(o => {
    const props = nodeProps(o);
    const rvfNode = {
      node: {
        id: o[id],
        radius: 12,
      },
      className: cx('graph-node', props),
      labelClass: cx('node-label', props),
    };
    return rvfNode;
  });

  const hist = {}; // (hist)ory of links made
  // the extra arrays are to influence draw order
  const links: RVF_ForceLink[] = [];
  const sLinks: RVF_ForceLink[] = [];
  const hLinks: RVF_ForceLink[] = [];
  maps.forEach(map => {
    Object.values(map).forEach(objMaps => {
      const objs = Object.values(objMaps);
      for (let i = 0; i < objs.length - 1; i++) {
        const src = objs[i];
        const srcProps = nodeProps(src);
        const source: string = src[id];
        if (!hist[source]) {
          hist[source] = {};
        }
        for (let j = i + 1; j < objs.length; j++) {
          const tgt = objs[j];
          const tgtProps = tgt;
          const target: string = tgt[id];
          if (hist[source][target]) continue; // drop dup links

          const linkProps = R.mergeDeepWith(R.and, srcProps, tgtProps);
          const rvfLink: RVF_ForceLink = {
            link: { source, target, value: 4 },
            className: cx('graph-link', linkProps),
          };

          // TODO, shouldnt expose highlight and selected
          const linksPtr =
            linkProps.highlight ? hLinks :
              linkProps.selected ? sLinks : links;

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
