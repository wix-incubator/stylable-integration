import { readFileSync, Stats } from 'fs';
import { transformStylableCSS } from './stylable-transform';
import { Stylesheet as StylableSheet, Generator, objectifyCSS, Resolver } from 'stylable';
import { FSResolver } from "./fs-resolver";
import { StylableIntegrationDefaults,StylableIntegrationOptions} from './options';
import loaderUtils = require('loader-utils');
import { dirname } from 'path';
import webpack = require('webpack');

// const assetDir:string = '/dist/assets';

let firstRun:boolean = true;

let used : StylableSheet[] = [];
let projectAssetsMap:{[key:string]:string} = {};


function createIsUsedComment(ns:string){
    return '\n//*stylable*'+ns+'*stylable*';
}

export function loader(this:webpack.loader.LoaderContext, source: string) {
    const options = { ...StylableIntegrationDefaults, ...loaderUtils.getOptions(this) };
    const resolver = (options as any).resolver || new FSResolver(options.defaultPrefix,this.options.context);
    const { sheet, code,assetMapping } = transformStylableCSS(
        source,
        this.resourcePath,
        this.context,
        resolver,
        this.options.context,
        options
    );
    const codeWithComment = code + createIsUsedComment(sheet.namespace);
    Object.assign(projectAssetsMap, assetMapping);
    used.push(sheet);
    this.addDependency('stylable');

    // sheet.imports.forEach((importDef: any) => {
    //     this.addDependency(importDef.from);
    // });
    return codeWithComment;
};

function isArray(a:any): a is Array<any>{
    return !!a.push
}

export class Plugin{
    constructor(private options:StylableIntegrationOptions,private resolver?:FSResolver){
    };
    apply = (compiler:webpack.Compiler)=>{

        compiler.plugin('emit',(compilation,callback)=>{
            const entryOptions:string | {[key:string]:string | string[]} | undefined | string[] = compiler.options.entry;
            let entries:{[key:string]:string | string[]} = typeof entryOptions === 'object' ? entryOptions as any : {'bundle':entryOptions};
            let simpleEntries:{[key:string]:string} = {};
            Object.keys(entries).forEach((entryName:string)=>{
                const entry = entries[entryName];
                if(isArray(entry)){
                    simpleEntries[entryName] = entry[entry.length-1];
                }else{
                    simpleEntries[entryName] = entry;
                }
            })
            const options = { ...StylableIntegrationDefaults, ...this.options };
            const resolver = this.resolver || new FSResolver(options.defaultPrefix,compilation.options.context);
            Object.keys(simpleEntries).forEach(entryName=>{
                const entryContent = compilation.assets[entryName+'.js'].source();
                const gen = new Generator({resolver, namespaceDivider:options.nsDelimiter});
                used.reverse().forEach((sheet)=>{
                    const idComment = createIsUsedComment(sheet.namespace);
                    if(entryContent.indexOf(idComment)!==-1){
                        gen.addEntry(sheet, false);
                    }
                })
                const resultCssBundle = gen.buffer.join('\n');
                compilation.assets[entryName+'.css'] = {
                    source: function(){
                        return new Buffer(resultCssBundle,"utf-8")
                    },
                    size: function(){
                        return Buffer.byteLength(resultCssBundle,"utf-8");
                    }
                }
                const cssBundleDevLocation = '//'+entryName+'.css'

                // const originalBundle = compilation.assets[entryName+'.js']
                // compilation.assets[entryName+'.js'] = {
                //     source: function(){
                //         return originalBundle.source+bundleAddition;
                //     },
                //     size: function(){
                //         return originalBundle.size+bundleAddition.length;
                //     }
                // }

            });
            used = [];
            let stats:Stats;
            Promise.all(Object.keys(projectAssetsMap).map((assetOriginalPath)=>{
                return resolver.statAsync(assetOriginalPath)
                .then((stat)=>{
                    // We don't write empty directories
                    if (stat.isDirectory()) {
                        return;
                    };
                    stats = stat;
                    return resolver.readFileAsync(assetOriginalPath)
                })
                .then((content)=>{
                    const fs = resolver.fsToUse;
                    const rootPath = compilation.options.context;
                    const targetPath = '../'+projectAssetsMap[assetOriginalPath].replace(rootPath,'');
                    compilation.assets[targetPath] = {
                        source: function(){
                            return content
                        },
                        size: function(){
                            return content!.byteLength;
                        }
                    }
                })
            }))
            .then(()=>{
                projectAssetsMap = {};
                callback();
            })


        });
    }
}
