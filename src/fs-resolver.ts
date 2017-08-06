import { readFileSync, readFile ,stat,Stats} from 'fs';
import * as fs from 'fs';
import { dirname } from 'path';
import { Resolver } from 'stylable'; //peer
import { createStylesheetWithNamespace, resolveImports } from './stylable-transform';

export interface fsLike {
    readFileSync:typeof fs.readFileSync;
    readFile:typeof fs.readFile;
    stat:typeof fs.stat;

}

export class FSResolver extends Resolver {
    constructor(private prefix: string, private projectRoot:string, private fsToUse:fsLike = fs) {
        super({});
    }
    resolveModule(path: string) {
        var resolved;
        if (path.match(/\.css$/)) {
            resolved = createStylesheetWithNamespace(
                resolveImports(this.fsToUse.readFileSync(path, 'utf8'), dirname(path),this.projectRoot).resolved,
                path,
                this.prefix
            );
        } else {
            resolved = require(path);
        }

        return resolved;
    }
    statAsync(path:string):Promise<Stats>{
        return new Promise((resolve)=>{
            this.fsToUse.stat(path,(err,res)=>{
                resolve(res)
            })
        })
    }
    readFileAsync(path:string):Promise<Buffer | undefined>{
        return new Promise<Buffer>((resolve,reject)=>{
            this.fsToUse.readFile(path,(err,data)=>{
                if(data){
                    resolve(data)
                }else{
                    reject(err);
                }
            });

        })
    }
}
