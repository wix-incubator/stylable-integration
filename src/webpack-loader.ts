import { readFileSync } from 'fs';
import { transformStylableCSS, defaults } from './stylable-transform';
import { Stylesheet, Generator, objectifyCSS, Resolver } from 'stylable';
import { FSResolver } from "./fs-resolver";
import loaderUtils = require('loader-utils');
import webpack = require('webpack');

let firstRun:boolean = true;

let used : any[] = [];


export function loader(this:webpack.loader.LoaderContext, source: string) {
    const options = { ...defaults, ...loaderUtils.getOptions(this) };
    const resolver = (options as any).resolver || new FSResolver(options.defaultPrefix);

    const { sheet, code } = transformStylableCSS(
        source,
        this.resourcePath,
        this.context,
        resolver,
        options
    );
    used.push(sheet)
    this.addDependency('stylable');

    // sheet.imports.forEach((importDef: any) => {
    //     this.addDependency(importDef.from);
    // });

    return code;
};


export class Plugin{
    constructor(private resolver:Resolver = new FSResolver(defaults.defaultPrefix)){
    };
    apply = (compiler:webpack.Compiler)=>{
        const that = this;

        compiler.plugin('emit',(compilation,callback)=>{
            const options = { ...defaults };
            const gen = new Generator({resolver:that.resolver});
            used.reverse().forEach((s:Stylesheet)=>{
                 gen.addEntry(s, false);
            })
            const resultCssBundle = gen.buffer.join('\n');
            compilation.assets['bundle.css'] = {
                source: function(){
                    return resultCssBundle
                },
                size: function(){
                    return resultCssBundle.length;
                }
            }
            used = [];
            callback();
        });
    }
}
