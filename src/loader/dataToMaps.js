const keys = ['class', 'origin'];
// maps of json objs by key
export function jsonToMaps(jsonObjs) {
  return jsonObjs.reduce((maps, json) => {
    keys.forEach(key => {
      json[key].forEach(val => {
        if (!imaps[val]) {
          maps[val] = [];
        }
        maps[val].push(json);
      });
    });
    return maps;
  }, {});
}
