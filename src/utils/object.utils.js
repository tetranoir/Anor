// no conflicting keys
export function objFromAry(key, ary) {
  return ary.reduce((obj, el) => {
    obj[el[key]] = el;
    return obj;
  }, {});
}
