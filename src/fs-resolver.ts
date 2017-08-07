import { readFileSync, readFile ,stat,Stats} from 'fs';
import * as fs from 'fs';
import { dirname } from 'path';
import { Resolver } from 'stylable'; //peer
import { createStylesheetWithNamespace, resolveImports } from './stylable-transform';
import { ResolverFactory , CachedInputFileSystem, NodeJsInputFileSystem} from 'enhanced-resolve';

export interface fsLike {
    readFileSync:typeof fs.readFileSync;
    readFile:typeof fs.readFile;
    stat:typeof fs.stat;
    readdir:typeof fs.readdir;
    readlink:typeof fs.readlink;
    existsSync:typeof fs.existsSync;
    writeFileSync:typeof fs.writeFileSync;
    mkdirSync:typeof fs.mkdirSync;
}

export class FSResolver extends Resolver {
    constructor(private prefix: string, private projectRoot:string, public fsToUse:fsLike = fs) {
        super({});
    }
    resolveModule(path: string) {
        var resolved;
        if (path.match(/\.css$/)) {
            const eResolver = ResolverFactory.createResolver({
                fileSystem:this.fsToUse,
                useSyncFileSystemCalls:true
            })

            if(path.indexOf(':\\')==-1){
                path = eResolver.resolveSync({},this.projectRoot,path);
            }
            //this.fsToUse.readFileSync("C:\\projects\\stylable-integration\\node_modules\\my-lib\\sources\\comp.css")
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
