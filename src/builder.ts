#!/usr/bin/env node
import { transformStylableCSS } from "./stylable-transform";
import { FSResolver } from "./fs-resolver";
import { dirname, join } from "path";
import { htap } from "htap";
import { StylableIntegrationDefaults,StylableIntegrationOptions} from "./options";
import { ensureAssets } from "./assetor";
import * as fs from 'fs'

export type globSearcher = (match:string,options:object,callback:(er: Error | null, files: string[])=>void)=>void;


export function build(match:string,suppliedFs:typeof fs,resolver:FSResolver,outDir:string,srcDir:string,cwd:string,glob:globSearcher,log?:(...args:string[])=>void){
    const fullSrcDir = join(cwd, srcDir);
    const fullMatch = htap(srcDir, match);
    glob(fullMatch, {}, function (er: Error, files: string[]) {
        const projectAssetMapping:{[key:string]:string} = {};
        files.forEach((file) => {
            const fullpath = join(cwd, file);
            const outSrcPath = join(cwd, outDir, fullpath.replace(fullSrcDir, ''));
            const outPath = outSrcPath + '.js';
            log && log('[Build]', fullpath + ' --> ' + outPath);
            const content = tryRun(() => suppliedFs.readFileSync(fullpath, 'utf8'), 'Read File Error');
            const dir = dirname(fullpath);
            const outDirPath = dirname(outPath);
            const { code ,assetMapping} = tryRun(() => transformStylableCSS(content, fullpath, dir, resolver,cwd,{...StylableIntegrationDefaults,injectFileCss:true,assetsDir:join(cwd, outDir)}), 'Transform Error');
            Object.assign(projectAssetMapping,assetMapping);
            const hasDir = suppliedFs.existsSync(outDirPath);
            if(!hasDir){
                tryRun(() => suppliedFs.mkdirSync(outDirPath, code), 'create dir Error');
            }
            tryRun(() => suppliedFs.writeFileSync(outSrcPath, content), 'Write File Error');
            tryRun(() => suppliedFs.writeFileSync(outPath, code), 'Write File Error');
        });
        Object.keys(projectAssetMapping).forEach((originalPath:string)=>{
            projectAssetMapping[originalPath] = originalPath.replace(join(cwd, srcDir),join(cwd, outDir))
        })
        ensureAssets(projectAssetMapping,resolver,cwd);
    });
}


function tryRun<T>(fn: () => T, errorMessage: string): T {
    try {
        return fn();
    } catch (e) {
        throw new Error(errorMessage + ': \n' + e.stack)
    }
}
