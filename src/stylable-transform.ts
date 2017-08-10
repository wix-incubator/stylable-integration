import { Stylesheet, Generator, objectifyCSS, Resolver } from 'stylable';
import path = require('path');
import { htap } from "htap";
const deindent = require('deindent');
const murmurhash = require('murmurhash');
import {StylableIntegrationDefaults,StylableIntegrationOptions} from './options';
import {fsLike} from './types';
import * as UrlLoader from 'url-loader';
let currentOptions:StylableIntegrationOptions;
//TODO: remove this regexps!!!!
const relativeImportRegExp1 = /:import\(["']?(\.\/)(.*?)["']?\)/gm;
const relativeImportRegExp2 = /-st-from\s*:\s*["'](\.\.?\/)(.*?)["']/gm;
const relativeImportAsset = /url\s*\(\s*["']?(.*?)["']?\s*\)/gm;

export function resolveImports(this:any,source: string, fs:fsLike, context: string, projectRoot:string,ldr?:any) {
    const importMapping: { [key: string]: string } = {};
    const that = this;
    const resolved = source
        .replace(relativeImportRegExp1, replace)
        .replace(relativeImportRegExp2, replace)


    function replace(match: string, rel: string, thing: string) {
        const relativePath = rel + thing;
        const fullPath = path.resolve(htap(context, relativePath));
        importMapping[relativePath] = fullPath;
        importMapping[fullPath] = relativePath;
        return match.replace(relativePath, fullPath);
    }

    return { resolved, importMapping};
}


export function getUsedAssets(source:string):string[]{
    const splitSource = source.split(relativeImportAsset);
    const res:string[] = [];
    splitSource.forEach((chunk,idx)=>{
        if(idx%2){
            res.push(chunk);
        }
    })
    return res;
}

export function replaceAssetsAsync(source:string,resolveAssetAsync:(relativeUrl:string)=>Promise<string>):Promise<string>{
    const splitSource = source.split(relativeImportAsset);
    return Promise.all(splitSource.map((srcChunk,idx)=>{
        if(idx%2){
            return resolveAssetAsync(srcChunk).then((resolved)=>`url("${resolved}")`);
        }else{
            return srcChunk;
        }
    })).then((modifiedSplitSource)=>{
        return modifiedSplitSource.join('');
    })

}

export function createStylesheetWithNamespace(source: string, path: string, prefix: string = StylableIntegrationDefaults.defaultPrefix) {
    const cssObject = objectifyCSS(source);
    const atNS = cssObject['@namespace'];
    const ns = Array.isArray(atNS) ? atNS[atNS.length - 1] : atNS;
    const namespace = (ns || prefix) + murmurhash.v3(path).toString(36);
    return new Stylesheet(cssObject, namespace, path);
}

export function createImportString(importDef: any, path: string) {
    var imports = importDef.defaultExport ? [`var ${importDef.defaultExport} = require("${(path)}");`] : [];
    for (var k in importDef.named) {
        imports.push(`var ${importDef.defaultExport} = require("${(path)}")[${JSON.stringify(importDef.named[k])}];`);
    }
    return imports.join('\n');
}

export function justImport(path: string) {
    return `require("${path}");`;
}

export function transformStylableCSS(source: string, resourcePath: string, context: string, resolver: Resolver, projectRoot:string, options: StylableIntegrationOptions = StylableIntegrationDefaults,ldr?:any) {
    currentOptions = options;
    const { resolved, importMapping } = resolveImports(source,(resolver as any).fsToUse , context, projectRoot,ldr);
    const sheet = createStylesheetWithNamespace(resolved, resourcePath, options.defaultPrefix);
    const imports = sheet.imports.map((importDef: any) => {
        return justImport(importMapping[importDef.from]);
    });

    let css:string = '';
    const gen = new Generator({ resolver, namespaceDivider:options.nsDelimiter });
    gen.addEntry(sheet, false);
    if(options.injectFileCss){
        css = JSON.stringify(gen.buffer.join('\n'))
    }



    const root = JSON.stringify(sheet.root);
    const namespace = JSON.stringify(sheet.namespace);
    const classes = JSON.stringify(Object.assign({}, sheet.vars, sheet.classes));
    // const runtimePath = path.join(__dirname, "runtime").replace(/\\/gm, "\\\\");
    const runtimePath = 'stylable/runtime';
    // ${imports.join('\n')}
    let code:string = '';
     if (options.injectFileCss) {
        code = deindent`
            Object.defineProperty(exports, "__esModule", { value: true });
            module.exports.default = require("${runtimePath}").create(
                ${root},
                ${namespace},
                ${classes},
                ${css},
                module.id
            );
        `;

    } else {
        code = deindent`
            Object.defineProperty(exports, "__esModule", { value: true });
            module.exports.default = module.exports.locals = require("${runtimePath}").create(
                ${root},
                ${namespace},
                ${classes},
                null,
                module.id
            );
        `;
    }




    return { sheet, code };

}
