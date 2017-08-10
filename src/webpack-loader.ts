import { readFileSync } from 'fs';
import { transformStylableCSS, replaceAssetsAsync } from './stylable-transform';
import { Stylesheet as StylableSheet, Generator, objectifyCSS, Resolver } from 'stylable';
import { FSResolver } from "./fs-resolver";
import { StylableIntegrationDefaults,StylableIntegrationOptions} from './options';
import loaderUtils = require('loader-utils');
import { dirname , join} from 'path';
import webpack = require('webpack');
// const assetDir:string = '/dist/assets';

let firstRun:boolean = true;

let used : StylableSheet[] = [];
let projectAssetsMap:{[key:string]:string} = {};
function createIsUsedComment(ns:string){
    return '\n//*stylable*'+ns+'*stylable*';
}

export function loader(this:webpack.loader.LoaderContext, source: string) {
    let originalCode:string = '';
    let resourcePath = this.resourcePath;
    if(this.resourcePath.indexOf('.css.js')===this.resourcePath.length-7){
        originalCode = source;
        resourcePath = this.resourcePath.slice(0,this.resourcePath.length-3);
        source = this.fs.readFileSync(resourcePath+'.src').toString();
    }
    const options = { ...StylableIntegrationDefaults, ...loaderUtils.getOptions(this) };
    const resolver = new FSResolver(options.defaultPrefix,this.options.context,this.fs);
    const publicPath  = this.options.output.publicPath || '//assets';
    return replaceAssetsAsync(source,(relativeUrl:string)=>{
        return new Promise<string>((resolve)=>{
            this.addDependency(relativeUrl);
            //seems to be an error in webpack d.ts
            (this as any).loadModule(relativeUrl,(err:Error | null,data:string)=>{
                if(data && !err){
                    const mod = {exports:''};
                    Function("module","__webpack_public_path__",data)(mod,publicPath)
                    resolve(mod.exports)
                }
                resolve(relativeUrl)
            })
        });
    }).then((modifiedSource)=>{
        let modifiedCode = '';
        try{
            const { sheet, code } = transformStylableCSS(
                modifiedSource,
                resourcePath,
                this.context,
                resolver,
                this.options.context,
                options
            );
            modifiedCode = code;
            if(options.injectBundleCss && !firstRun){
                const rand = Math.random();
                modifiedCode+='\n+window.refreshStyleSheet('+rand+');\n'
            }
            modifiedCode = modifiedCode + createIsUsedComment(sheet.namespace);

            used.push(sheet);
            this.addDependency('stylable');
        } catch (err){
            console.error(err.message,err.stack);
        }

        return modifiedCode;
    })

};

function isArray(a:any): a is Array<any>{
    return !!a.push
}



export class Plugin{
    constructor(private options:StylableIntegrationOptions,private resolver?:FSResolver){
    };
    apply = (compiler:webpack.Compiler)=>{

        compiler.plugin('run',(compilation,callback)=>{
            firstRun = true;
            callback();
        })
        compiler.plugin('emit',(compilation,callback)=>{
            firstRun = false;
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
            const resolver = new FSResolver(options.defaultPrefix,compilation.options.context,compilation.inputFileSystem);
            Object.keys(simpleEntries).forEach(entryName=>{
                const outputFormat = compilation.options.output.filename;
                const bundleName = outputFormat.replace('[name]', entryName);
                const bundleCssName  = bundleName.lastIndexOf('.js') === bundleName.length-3 ? bundleName.slice(0,bundleName.length-3)+'.css' : bundleName+'.css';
                const entryContent = compilation.assets[bundleName].source();
                if(this.options.injectBundleCss){
                    const cssBundleLocation = compilation.options.output.publicPath+bundleCssName;
                    const bundleAddition =  `(()=>{if (typeof document !== 'undefined') {
                        window.refreshStyleSheet = ()=>{
                            style = document.getElementById('cssBundle');
                            if(!style){
                                style = document.createElement('link');
                                style.id = "cssBundle";
                                style.setAttribute('rel','stylesheet');
                                style.setAttribute('href','${cssBundleLocation}');
                                document.head.appendChild(style);
                            }else{
                                style.setAttribute('href','${cssBundleLocation}?queryBuster=${Math.random()}');
                            }
                        }
                        window.refreshStyleSheet();
                    }})()`
                    const revisedSource = bundleAddition+' ,'+compilation.assets[bundleName].source();
                    compilation.assets[bundleName] = {
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
                compilation.assets[bundleCssName] = {
                    source: function(){
                        return new Buffer(resultCssBundle,"utf-8")
                    },
                    size: function(){
                        return Buffer.byteLength(resultCssBundle,"utf-8");
                    }
                }

            });
            used = [];
            callback();
        });
    }
}
