import { State } from '../knowledge/modelapp';

const hideFilter = true;

/// EXPORT to react-vis-force
type HexColor = string;
interface RVF_ForceNode {
  node: RVF_Node;
  className?: string;
  fill?: HexColor;
  opacity?: number; // 0 - 1
  stroke?: HexColor;
  strokeWidth?: number; // in pixels
}
interface RVF_ForceLink {
  link: RVF_Link,
  edgeOffset?: number;
  strokeWidth?: number;
  className?: string;
  opacity?: number;
  stroke?: HexColor;
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
export function mapToReactVisForce(id, objs: State[], allObjMap, maps) {
  if (hideFilter) {
    objs = objs.filter(o => o.active);
  }

  const nodes: RVF_ForceNode[] = objs.map(o => {
    const rvfNode = {
      node: {
        id: o[id],
        radius: 12,
      },
      opacity: o.active ? 1 : 0.3,
    };
    return rvfNode;
  });

  const hist = {}; // (hist)ory of links made
  const links: RVF_ForceLink[] = maps.reduce((lks, map) => {
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
          const rvfLink: RVF_ForceLink = {
            link: { source, target, value: 4 },
          };
          if (!allObjMap[target].active || !allObjMap[source].active) {
            if (hideFilter) {
              continue;
            }
          }
          lks.push(rvfLink);
          hist[source][target] = rvfLink;
        }
      }
    });
    return lks;
  }, []);

  if (nodes.length === 0) {
    nodes.push({node: {id: '???'}});
  }

  return { nodes, links };
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
