export function mapsToD3Graph(id, objs, allObjMap, maps) {
  // const nodes = objs.filter(o => o.active).map(o => ({ ...o, id: o[id] }));
  const nodes = objs.map(o => ({
    ...o,
    id: o[id],
    opacity: o.active ? 1 : 0.3,
  }));

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
          const link = { source, target };
          if (!allObjMap[target].active || !allObjMap[source].active) {
            link.opacity = 0.3;
          } else {
            link.opacity = 1;
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
