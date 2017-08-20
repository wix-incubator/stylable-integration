import * as fs from 'fs';
import * as path from 'path';
import { cachedProcessFile, StylableMeta, process, safeParse, FileProcessor } from 'stylable';

import { ResolverFactory } from 'enhanced-resolve';
import { fsLike } from "./types";

// export class FSResolver extends Resolver {
//     private fs: fsLike;
//     constructor(private prefix: string, private projectRoot: string, _fs: fsLike = fs) {
//         super({});
//         this.fs = _fs
//     }
//     resolveModule(modulePath: string) {
//         var resolved;
//         if (modulePath.match(/\.css$/)) {
//             const eResolver = ResolverFactory.createResolver({
//                 fileSystem: this.fs,
//                 useSyncFileSystemCalls: true
//             })

//             if (!path.isAbsolute(modulePath)) {
//                 modulePath = eResolver.resolveSync({}, this.projectRoot, modulePath);
//             }
//             resolved = createStylesheetWithNamespace(
//                 resolveImports(this.fs.readFileSync(modulePath).toString(), path.dirname(modulePath)).resolved,
//                 modulePath,
//                 this.prefix
//             );
//         } else {
//             resolved = require(modulePath);
//         }

//         return resolved;
//     }
// }



export interface NewResolver {
    fileProcessor: FileProcessor<StylableMeta>,
    requireModule: (path: string) => any
}

export function createResolver(projectRoot: string, fileSystem: fsLike = fs, requireModule = require): NewResolver {

    const eResolver = ResolverFactory.createResolver({
        fileSystem,
        useSyncFileSystemCalls: true
    })

    const fileProcessor = cachedProcessFile<StylableMeta>((from, content) => {
        if (!path.isAbsolute(from)) {
            from = eResolver.resolveSync({}, projectRoot, from);
        }
        return process(safeParse(content, { from }));
    }, {
        readFileSync(moduleId: string) {
            if (!path.isAbsolute(moduleId)) {
                moduleId = eResolver.resolveSync({}, projectRoot, moduleId);
            }
            return fileSystem.readFileSync(moduleId, 'utf8');
        },
        statSync(moduleId: string) {
            if (!path.isAbsolute(moduleId)) {
                moduleId = eResolver.resolveSync({}, projectRoot, moduleId);
            }
            const stat = fileSystem.statSync(moduleId);
            if(!stat.mtime){
                return {
                    mtime: new Date(0)
                }
            }

            return stat;
        }
    });

    return {
        requireModule,
        fileProcessor
    };
}
