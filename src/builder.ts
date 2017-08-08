#!/usr/bin/env node
import { transformStylableCSS } from "./stylable-transform";
import { FSResolver } from "./fs-resolver";
import { dirname, join } from "path";
import { htap } from "htap";
import { StylableIntegrationDefaults,StylableIntegrationOptions} from "./options";
import * as fs from 'fs'

export type globSearcher = (match:string,options:object,callback:(er: Error | null, files: string[])=>void)=>void;


export function build(match:string,suppliedFs:typeof fs,resolver:FSResolver,outDir:string,srcDir:string,cwd:string,glob:globSearcher,log?:(...args:string[])=>void){
    const fullSrcDir = join(cwd, srcDir);
    const fullMatch = htap(srcDir, match);
    glob(fullMatch, {}, function (er: Error, files: string[]) {

        files.forEach((file) => {
            const fullpath = join(cwd, file);
            const outPath = join(cwd, outDir, fullpath.replace(fullSrcDir, '') + '.js');
            log && log('[Build]', fullpath + ' --> ' + outPath);
            const content = tryRun(() => suppliedFs.readFileSync(fullpath, 'utf8'), 'Read File Error');
            const dir = dirname(fullpath);
            const outDirPath = dirname(outPath);
            const { code } = tryRun(() => transformStylableCSS(content, fullpath, dir, resolver,cwd,{...StylableIntegrationDefaults,injectFileCss:true}), 'Transform Error');
            const hasDir = suppliedFs.existsSync(outDirPath);
            if(!hasDir){
                tryRun(() => suppliedFs.mkdirSync(outDirPath, code), 'create dir Error');
            }
            tryRun(() => suppliedFs.writeFileSync(outPath, code), 'Write File Error');
        });

    });
}


function tryRun<T>(fn: () => T, errorMessage: string): T {
    try {
        return fn();
    } catch (e) {
        throw new Error(errorMessage + ': \n' + e.stack)
    }
}
