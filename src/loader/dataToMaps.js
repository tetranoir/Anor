const keys = ['class', 'origin'];
// maps of json objs by key
export function jsonToMaps(jsonObjs) {
  return jsonObjs.reduce((maps, json) => {
    keys.forEach(key => {
      json[key].forEach(val => {
        if (!maps[key][val]) {
          maps[key][val] = [];
        }
        maps[key][val].push(json);
      });
    });
    return maps;
  }, keys.reduce((m, k) => ({ ...m, [k]: {} }), {}));
}
