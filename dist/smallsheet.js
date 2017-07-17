"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function default_1(namespace, classes, css) {
    if (typeof document !== 'undefined') {
        var style = document.head.querySelector("#" + namespace) || document.createElement('style');
        style.id = namespace;
        style.textContent = css;
        document.head.appendChild(style);
    }
    classes.$stylesheet = {
        namespace: namespace,
        get: function (localName) {
            return classes[localName];
        },
        cssStates: function (stateMapping) {
            return stateMapping ? Object.keys(stateMapping).reduce(function (states, key) {
                if (stateMapping[key]) {
                    states["data-" + namespace.toLowerCase() + "-" + key.toLowerCase()] = true;
                }
                return states;
            }, {}) : {};
        }
    };
    return classes;
}
exports.default = default_1;
