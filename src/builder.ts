#!/usr/bin/env node
import { transformStylableCSS,getUsedAssets } from "./stylable-transform";
import { FSResolver } from "./fs-resolver";
import { dirname, join ,resolve} from "path";
import { htap } from "htap";
import { StylableIntegrationDefaults,StylableIntegrationOptions} from "./options";
import { ensureAssets } from "./assetor";
import * as fs from 'fs'

export type globSearcher = (match:string,options:object,callback:(er: Error | null, files: string[])=>void)=>void;


export function build(match:string,suppliedFs:typeof fs,resolver:FSResolver,outDir:string,srcDir:string,cwd:string,glob:globSearcher,log?:(...args:string[])=>void){
    const fullSrcDir = join(cwd, srcDir);
    const fullMatch = htap(srcDir, match);
    let projectAssets: string[]= [];
    glob(fullMatch, {}, function (er: Error, files: string[]) {
        const projectAssetMapping:{[key:string]:string} = {};
        files.forEach((file) => {
            const fullpath = join(cwd, file);
            const outSrcPath = join(cwd, outDir, fullpath.replace(fullSrcDir, ''));
            const outPath = outSrcPath + '.js';
            log && log('[Build]', fullpath + ' --> ' + outPath);
            const content = tryRun(() => suppliedFs.readFileSync(fullpath, 'utf8').toString(), 'Read File Error');
            const dir = dirname(fullpath);
            const outDirPath = dirname(outPath);
            const { code } = tryRun(() => transformStylableCSS(content, fullpath, dir, resolver,cwd,{...StylableIntegrationDefaults,injectFileCss:true}), 'Transform Error');
            const hasDir = suppliedFs.existsSync(outDirPath);
            if(!hasDir){
                tryRun(() => suppliedFs.mkdirSync(outDirPath, code), 'create dir Error');
            }
            tryRun(() => suppliedFs.writeFileSync(outSrcPath, content), 'Write File Error');
            tryRun(() => suppliedFs.writeFileSync(outPath, code), 'Write File Error');
            projectAssets = projectAssets.concat(getUsedAssets(content).map((uri:string)=>resolve(dir,uri)));
        });
        projectAssets.forEach((originalPath:string)=>{
            projectAssetMapping[originalPath] = originalPath.replace(join(cwd, srcDir),join(cwd, outDir))
        })
        ensureAssets(projectAssetMapping,suppliedFs,cwd);
    });
}


function tryRun<T>(fn: () => T, errorMessage: string): T {
    try {
        return fn();
    } catch (e) {
        throw new Error(errorMessage + ': \n' + e.stack)
    }
}
