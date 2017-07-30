import { readFileSync, Stats } from 'fs';
import { transformStylableCSS, defaults } from './stylable-transform';
import { Stylesheet, Generator, objectifyCSS, Resolver } from 'stylable';
import { FSResolver } from "./fs-resolver";
import loaderUtils = require('loader-utils');
import webpack = require('webpack');

// const assetDir:string = '/dist/assets';

let firstRun:boolean = true;

let used : any[] = [];
let projectAssetMapping:{[originalPath:string]:string} = {};

export function loader(this:webpack.loader.LoaderContext, source: string) {
    const options = { ...defaults, ...loaderUtils.getOptions(this) };
    const resolver = (options as any).resolver || new FSResolver(options.defaultPrefix);
    const { sheet, code,assetMapping } = transformStylableCSS(
        source,
        this.resourcePath,
        this.context,
        resolver,
        options
    );
    Object.assign(projectAssetMapping,assetMapping);
    used.push(sheet)
    this.addDependency('stylable');

    // sheet.imports.forEach((importDef: any) => {
    //     this.addDependency(importDef.from);
    // });

    return code;
};


export class Plugin{
    constructor(private resolver:FSResolver = new FSResolver(defaults.defaultPrefix),private options:typeof defaults){
    };
    apply = (compiler:webpack.Compiler)=>{
        const that = this;

        compiler.plugin('emit',(compilation,callback)=>{
            const options = { ...defaults, ...this.options };
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
            let stats:Stats;
            Promise.all(Object.keys(projectAssetMapping).map((assetLocalName)=>{
                const globalPath = projectAssetMapping[assetLocalName];
                return this.resolver.statAsync(assetLocalName)
                .then((stat)=>{
                    console.log(assetLocalName);
                    // We don't write empty directories
                    if (stat.isDirectory()) {
                        return;
                    };
                    stats = stat;
                    return this.resolver.readFileAsync(assetLocalName)
                })
                .then((content)=>{
                    compilation.assets[globalPath] = {
                        source: function(){
                            return content
                        },
                        size: function(){
                            return stats.size;
                        }
                    }
                })
            }))
            .then(()=>{
                projectAssetMapping = {};
                callback()
            })


        });
    }
}
