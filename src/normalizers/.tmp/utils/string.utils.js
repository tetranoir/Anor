"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/** Removes all nonword characters from a string */
function encodeStr(s) {
    return s.replace(/[\W]/g, '');
}
exports.encodeStr = encodeStr;
//# sourceMappingURL=string.utils.js.map