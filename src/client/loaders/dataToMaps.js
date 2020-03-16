// maps of json objs by key
// todo rename to group by key
export function jsonToMaps(id, keys, jsonObjs) {
  return jsonObjs.reduce((maps, obj) => {
    keys.forEach(key => {
      [].concat(obj[key]).forEach(val => {
        if (!maps[key][val]) {
          maps[key][val] = {};
        }
        maps[key][val][obj[id]] = obj;
      });
    });
    return maps;
  }, keys.reduce((m, k) => ({ ...m, [k]: {} }), {}));
}
