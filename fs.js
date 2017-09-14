
var handler = {
    get: function(target, name) {
        return ()=>{
            throw new Error('Can\'t do it ' + name);
        }
    }
};

var p = new Proxy({}, handler);

module.exports = p;
