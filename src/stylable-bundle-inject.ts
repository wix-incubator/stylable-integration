import { RawSource } from 'webpack-sources';
const NormalModule = require('webpack/lib/NormalModule');

export class StylableBundleInjector {
    body: string;
    constructor(request: string, body: string) {
        const parser = { parse(_: any, state: any) { return state; } };
        const c = new NormalModule(request, request, request, [], request, parser);
        const source = new RawSource(body);
        c._source = source;
        c._cachedSource = source;
        c.body = source;
        c.build = build;
        return c;
    }
}

function build(this: any, options: any, compilation: any, resolver: any, _fs: any, callback: any) {
    NormalModule.prototype.build.call(this, options, compilation, resolver, {
        readFile: (_filepath: string, callback: Function) => {
            var buffy = new Buffer(`${this.body.source()}`);
            callback(null, buffy);
        }
    }, callback);
}