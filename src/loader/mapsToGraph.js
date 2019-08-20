export function mapsToD3Graph(id, objs, filtered, maps) {
  const nodes = objs.filter(o => o.active).map(o => ({ ...o, id: o[id] }));

  const hist = {};

  const links = maps.reduce((lks, map) => {
    Object.values(map).forEach(objMaps => {
      const objs = Object.values(objMaps);
      for (let i = 0; i < objs.length - 1; i++) {
        const source = objs[i].name;
        if (filtered[source]) break;
        if (!hist[source]) {
          hist[source] = {};
        }
        for (let j = i + 1; j < objs.length; j++) {
          const target = objs[j].name;
          if (filtered[target]) break;
          if (hist[source][target]) break;
          lks.push({ source, target });
          hist[source][target] = true;
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
