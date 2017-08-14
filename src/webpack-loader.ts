import { transformStylableCSS, replaceAssetsAsync } from './stylable-transform';
import { Stylesheet as StylableSheet, Generator } from 'stylable';
import { FSResolver } from "./fs-resolver";
import { StylableIntegrationDefaults,StylableIntegrationOptions} from './options';
import loaderUtils = require('loader-utils');
import webpack = require('webpack');

let firstRun:boolean = true;
let used : StylableSheet[] = [];

function createIsUsedComment(ns:string){
    return '\n//*stylable*'+ns+'*stylable*';
}

export function loader(this:webpack.loader.LoaderContext, source: string) {
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
                this.resourcePath,
                this.context,
                resolver,
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
    constructor(private options:StylableIntegrationOptions){
    };
    apply = (compiler:webpack.Compiler)=>{

        compiler.plugin('run',(_compilation,callback)=>{
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
