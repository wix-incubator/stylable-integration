import * as fs from 'fs';
import * as path from 'path';
import { Resolver } from 'stylable'; //peer
import { createStylesheetWithNamespace, resolveImports } from './stylable-transform';
import { ResolverFactory} from 'enhanced-resolve';
import {fsLike} from "./types";

export class FSResolver extends Resolver {
    private fs:fsLike;
    constructor(private prefix: string, private projectRoot:string, _fs:fsLike = fs) {
        super({});
        this.fs = _fs
    }
    resolveModule(modulePath: string) {
        var resolved;
        if (modulePath.match(/\.css$/)) {
            const eResolver = ResolverFactory.createResolver({
                fileSystem:this.fs,
                useSyncFileSystemCalls:true
            })
            if(!path.isAbsolute(modulePath)){
                modulePath = eResolver.resolveSync({},this.projectRoot,modulePath);
            }
            resolved = createStylesheetWithNamespace(
                resolveImports(this.fs.readFileSync(modulePath).toString(), path.dirname(modulePath)).resolved,
                modulePath,
                this.prefix
            );
        } else {
            resolved = require(modulePath);
        }

        return resolved;
    }
}
