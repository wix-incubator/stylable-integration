
interface SmallSheet {

}

interface StateMap { [key: string]: boolean }

export default function (namespace: string, classes: { $stylesheet?: SmallSheet }, css: string) {
    
    if(typeof document !== 'undefined'){
        var style = document.head.querySelector("#" + namespace) || document.createElement('style');
        style.id = namespace;
        style.textContent = css;
        document.head.appendChild(style);
    }

    classes.$stylesheet = {
        namespace: namespace,
        get(localName: string) {
            return (classes as { [key: string]: string })[localName];
        },
        cssStates(stateMapping: StateMap) {
            return stateMapping ? Object.keys(stateMapping).reduce(function (states, key) {
                if (stateMapping[key]) { states["data-" + namespace.toLowerCase() + "-" + key.toLowerCase()] = true; }
                return states;
            }, {} as StateMap) : {};
        }
    };

    return classes;
}