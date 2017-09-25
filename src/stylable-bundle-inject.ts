
const NormalModule = require('webpack/lib/NormalModule');

export class StylableBundleInjector {
    body: string;
    constructor(request: string, parser: any, body: any) {
        const c = new NormalModule(request, request, request, [], request, parser);
        c._source = c._cachedSource = c.body = body;
        c.build = build;
        return c;
    }
}

function build(this: any, options: any, compilation: any, resolver: any, _fs: any, callback: any) {
    NormalModule.prototype.build.call(this, options, compilation, resolver, {
        readFile: (_filepath: string, callback: Function) => {
            var buffy = new Buffer(`module.exports = { ${this.body} };`);
            callback(null, buffy);
        }
    }, callback);
}