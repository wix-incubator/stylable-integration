import { readFileSync } from 'fs';
import { transformStylableCSS, defaults } from './stylable-transform';
import { Stylesheet, Generator, objectifyCSS, Resolver } from 'stylable';
import { FSResolver } from "./fs-resolver";
import loaderUtils = require('loader-utils');
import webpack = require('webpack');

let firstRun:boolean = true;

const used : any[] = [];


export function loader(this:webpack.loader.LoaderContext, source: string) {
    const options = { ...defaults, ...loaderUtils.getOptions(this) };
    console.log('loading')
    const resolver = new FSResolver(options.defaultPrefix);

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
    // if(firstRun){
    //     firstRun = false;
    //     this._compiler.plugin('emit',(comp,...args)=>{
    //         console.log('emitting');
    //     })
    // }

    return code;
};


export class Plugin{
    apply(compiler:webpack.Compiler){
        compiler.plugin('emit',(compilation,callback)=>{
            const options = { ...defaults };
            const resolver = new FSResolver(options.defaultPrefix);
            const gen = new Generator({resolver});
            used.forEach((s:Stylesheet)=>{
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
            callback();
        });
    }
}
