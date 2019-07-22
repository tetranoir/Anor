export function mapsToD3Graph(objs, maps) {
  const nodes = objs.map(o => ({ ...o, id: o.name }));

  const hist = {};

  const links = maps.reduce((lks, map) => {
    Object.values(map).forEach(objs => {
      for (let i = 0; i < objs.length - 1; i++) {
        for (let j = i + 1; j < objs.length; j++) {
          const source = objs[i].name;
          const target = objs[j].name;
          if (!hist[source]) hist[source] = {};
          if (hist[source][target]) break;
          lks.push({ source, target });
          hist[source][target] = true;
        }
      }
    });
    return lks;
  }, []);

  return { nodes, links };
}
