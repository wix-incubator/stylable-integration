
module.exports = function (namespace, classes, css) {

    var style = document.head.querySelector("#" + namespace) || document.createElement('style');
    style.id = namespace;
    style.textContent = css;
    document.head.appendChild(style);

    classes.$stylesheet = {
        namespace: namespace,
        get(n) {
            return classes[n];
        },
        cssStates(stateMapping) {
            return stateMapping ? Object.keys(stateMapping).reduce(function (states, key) {
                if (stateMapping[key]) { states["data-" + namespace.toLowerCase() + "-" + key.toLowerCase()] = true; }
                return states;
            }, {}) : {};
        }
    };

    return classes;
}