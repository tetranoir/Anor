export function mapsToD3Graph(objs, maps) {
  const nodes = objs.map(o => ({ ...o, id: o.name }));

  const links = maps.reduce((lks, map) => {
    Object.values(map).forEach(objs => {
      for (let i = 0; i < objs.length - 1; i++) {
        for (let j = i + 1; j < objs.length; j++) {
          lks.push({ source: objs[i].name, target: objs[j].name});
        }
      }
    });
    return lks;
  }, []);

  return { nodes, links };
}
