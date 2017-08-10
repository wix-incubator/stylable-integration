import { readFileSync } from 'fs';
import { transformStylableCSS } from './stylable-transform';
import { Stylesheet as StylableSheet, Generator, objectifyCSS, Resolver } from 'stylable';
import { FSResolver } from "./fs-resolver";
import { StylableIntegrationDefaults,StylableIntegrationOptions} from './options';
import loaderUtils = require('loader-utils');
import { dirname , join} from 'path';
import {ensureAssets} from "./assetor";
import webpack = require('webpack');
// const assetDir:string = '/dist/assets';

let firstRun:boolean = true;

let used : StylableSheet[] = [];
let projectAssetsMap:{[key:string]:string} = {};
let projectAssetsVersions:{[key:string]:number} = {};

function createIsUsedComment(ns:string){
    return '\n//*stylable*'+ns+'*stylable*';
}

export function loader(this:webpack.loader.LoaderContext, source: string) {
    const options = { ...StylableIntegrationDefaults, ...loaderUtils.getOptions(this) };
    const resolver = (options as any).resolver || new FSResolver(options.defaultPrefix,this.options.context);

    (this as any).loadModule(join(this.context,'./banana.jpg'),(err:any,data:any)=>{
        debugger;
    })
    const { sheet, code, assetMapping } = transformStylableCSS(
        source,
        this.resourcePath,
        this.context,
        resolver,
        this.options.context,
        options,
        projectAssetsVersions,
        this
    );
    const codeWithComment = code + createIsUsedComment(sheet.namespace);
    Object.assign(projectAssetsMap, assetMapping);
    used.push(sheet);
    this.addDependency('stylable');
    Object.keys(assetMapping).forEach((asset)=>{
        this.addDependency(asset)
    })
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
        compiler.plugin('run',(compilation,callback)=>{
            projectAssetsVersions = {};
            callback();
        });
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
                if(this.options.injectBundleCss){
                    const cssBundleDevLocation = "http://localhost:8080/"+entryName+".css";
                    const bundleAddition =  `(()=>{if (typeof document !== 'undefined') {
                        style = document.getElementById('cssBundle');
                        if(!style){
                            style = document.createElement('link');
                            style.id = "cssBundle";
                            style.setAttribute('rel','stylesheet');
                            style.setAttribute('href','${cssBundleDevLocation}');
                            document.head.appendChild(style);
                        }else{
                            style.setAttribute('href','${cssBundleDevLocation}?queryBuster=${Math.random()}');
                        }
                    }})()`
                    const revisedSource = bundleAddition+' ,'+compilation.assets[entryName+'.js'].source();
                    compilation.assets[entryName+'.js'] = {
                        source: function(){
                            return new Buffer(revisedSource,"utf-8")
                        },
                        size: function(){
                            return Buffer.byteLength(revisedSource,"utf-8");
                        }
                    }
                }



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

            });
            used = [];

            ensureAssets(projectAssetsMap,resolver,compilation.options.context)
            Object.keys(projectAssetsMap).forEach((assetOrigPath)=>{
                if(!projectAssetsVersions[assetOrigPath]){
                    projectAssetsVersions[assetOrigPath] = 1;
                }else{

                    projectAssetsVersions[assetOrigPath]++;
                }
            });
            projectAssetsMap = {};
            callback();
        });
    }
}
