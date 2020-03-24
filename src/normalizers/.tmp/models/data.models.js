"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const presi_1 = require("presi");
// App model replicas in js
// object keys properties
exports.keys = ['class', 'origin'];
exports.id = 'name';
function isChampion(o) {
    return exports.keys.reduce((acc, key) => acc && Boolean(o[key]), true);
}
exports.isChampion = isChampion;
;
exports.SynergyType = presi_1.Z.oneOf(presi_1.Z.literal('class'), presi_1.Z.literal('origin'));
// checks for module exports for node
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        keys: exports.keys,
        id: exports.id,
        isChampion,
    };
}
//# sourceMappingURL=data.models.js.map