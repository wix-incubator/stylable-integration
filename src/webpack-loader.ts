import { readFileSync, Stats } from 'fs';
import { transformStylableCSS } from './stylable-transform';
import { Stylesheet as StylableSheet, Generator, objectifyCSS, Resolver } from 'stylable';
import { FSResolver } from "./fs-resolver";
import { StylableIntegrationDefaults,StylableIntegrationOptions} from './options';
import loaderUtils = require('loader-utils');
import webpack = require('webpack');

// const assetDir:string = '/dist/assets';

let firstRun:boolean = true;

let used : StylableSheet[] = [];
let projectAssetMapping:{[originalPath:string]:string} = {};


function createIsUsedComment(ns:string){
    return '\n//*stylable*'+ns+'*stylable*';
}

export function loader(this:webpack.loader.LoaderContext, source: string) {
    const options = { ...StylableIntegrationDefaults, ...loaderUtils.getOptions(this) };
    const resolver = (options as any).resolver || new FSResolver(options.defaultPrefix);
    const { sheet, code,assetMapping } = transformStylableCSS(
        source,
        this.resourcePath,
        this.context,
        resolver,
        options
    );
    const codeWithComment = code + createIsUsedComment(sheet.namespace);

    Object.assign(projectAssetMapping,assetMapping);
    used.push(sheet);
    this.addDependency('stylable');

    // sheet.imports.forEach((importDef: any) => {
    //     this.addDependency(importDef.from);
    // });

    return codeWithComment;
};


export class Plugin{
    constructor(private resolver:FSResolver = new FSResolver(StylableIntegrationDefaults.defaultPrefix),private options:StylableIntegrationOptions){
    };
    apply = (compiler:webpack.Compiler)=>{
        const that = this;

        compiler.plugin('emit',(compilation,callback)=>{
            const entryOptions:string | {[key:string]:string | string[]} | undefined | string[] = compiler.options.entry;
            const entries = typeof entryOptions === 'object' ? entryOptions : {'bundle':entryOptions};
            Object.keys(entries).forEach(entryName=>{
                console.info('looking for:'+entryName);
                console.info(compilation.assets)

                const entryContent = compilation.assets[entryName+'.js'].source();

                const options = { ...StylableIntegrationDefaults, ...this.options };

                const gen = new Generator({resolver:that.resolver});

                used.reverse().forEach((sheet)=>{
                    const idComment = createIsUsedComment(sheet.namespace);
                    if(entryContent.indexOf(idComment)!==-1){
                        gen.addEntry(sheet, false);
                    }
                })
                const resultCssBundle = gen.buffer.join('\n');
                compilation.assets[entryName+'.css'] = {
                    source: function(){
                        return resultCssBundle
                    },
                    size: function(){
                        return resultCssBundle.length;
                    }
                }
                // const bundleAddition = ''// ';\n alert("gaga");'
                // const originalBundle = compilation.assets[entryName+'.js']
                // compilation.assets[entryName+'.js'] = {
                //     source: function(){
                //         return originalBundle.source+bundleAddition;
                //     },
                //     size: function(){
                //         return originalBundle.size+bundleAddition.length;
                //     }
                // }

            })

            used = [];
            let stats:Stats;
            Promise.all(Object.keys(projectAssetMapping).map((assetOriginalPath)=>{
                const globalPath = projectAssetMapping[assetOriginalPath];
                return this.resolver.statAsync(assetOriginalPath)
                .then((stat)=>{
                    // We don't write empty directories
                    if (stat.isDirectory()) {
                        return;
                    };
                    stats = stat;
                    return this.resolver.readFileAsync(assetOriginalPath)
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
