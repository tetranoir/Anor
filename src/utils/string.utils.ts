
/** Removes all nonword characters from a string */
export function encodeStr(s: string) {
  return s.replace(/[\W]/g,'');
}
