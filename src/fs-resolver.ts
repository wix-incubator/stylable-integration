import * as fs from 'fs';
import * as path from 'path';
import { cachedProcessFile, StylableMeta, process, safeParse, FileProcessor, StylableResults, Diagnostics, StylableTransformer, StylableResolver, Bundler } from 'stylable';

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


export class Stylable {
    fileProcessor: FileProcessor<StylableMeta>;
    resolver: StylableResolver;
    resolvePath: (ctx: string, path: string) => string;
    constructor(
        protected projectRoot: string,
        protected fileSystem: fsLike,
        protected requireModule: (path: string) => any = require,
        protected delimiter?: string,
        protected transformCSSContent?: (path: string, content: string) => string) {
        const { fileProcessor, resolvePath } = createInfrastructure(projectRoot, fileSystem, transformCSSContent)
        this.resolvePath = resolvePath;
        this.fileProcessor = fileProcessor;
        this.resolver = new StylableResolver(this.fileProcessor, this.requireModule);
    }
    createBundler():Bundler {
        return new Bundler(
            this.resolver,
            (path: string) => ({ meta: this.fileProcessor.process(path), exports: {} }),
            (meta:StylableMeta) => this.transform(meta).meta
        );
    }
    // transform(source: string, resourcePath: string): StylableResults {

    //     const diagnostics = new Diagnostics();

    //     const root = safeParse(source, { from: resourcePath });

    //     const meta = process(root, diagnostics);

    //     const transformer = new StylableTransformer({
    //         delimiter: this.delimiter,
    //         diagnostics,
    //         fileProcessor: this.fileProcessor,
    //         requireModule: this.requireModule
    //     });

    //     this.fileProcessor.add(meta.source, meta);

    //     return transformer.transform(meta);
    // }

    transform(meta:StylableMeta): StylableResults
    transform(source: string, resourcePath: string): StylableResults
    transform(meta: string|StylableMeta, resourcePath?: string): StylableResults {
        const diagnostics = new Diagnostics();
        if(typeof meta === 'string') {
            const root = safeParse(meta, { from: resourcePath });
            meta = process(root, diagnostics);
        }
        (meta as any).astSource = meta.ast.clone();

        const transformer = new StylableTransformer({
            delimiter: this.delimiter,
            diagnostics: new Diagnostics(),
            fileProcessor: this.fileProcessor,
            requireModule: this.requireModule
        });

        this.fileProcessor.add(meta.source, meta);

        return transformer.transform(meta);
    }
    generate() { }
    process() {}
}

export interface StylableInfrastructure {
    fileProcessor: FileProcessor<StylableMeta>,
    resolvePath: (context: string, path: string) => string
}

export function createInfrastructure(projectRoot: string, fileSystem: fsLike = fs, transformSrc?: (path: string, content: string) => string): StylableInfrastructure {

    const eResolver = ResolverFactory.createResolver({
        fileSystem,
        useSyncFileSystemCalls: true
    })

    const fileProcessor = cachedProcessFile<StylableMeta>((from, content) => {
        if (!path.isAbsolute(from)) {
            from = eResolver.resolveSync({}, projectRoot, from);
        }
        content = transformSrc ? transformSrc(from, content) : content;
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
                if (!stat.mtime) {
                    return {
                        mtime: new Date(0)
                    }
                }

                return stat;
            }
        });

    return {
        resolvePath(context: string, moduleId: string) {
            if (!path.isAbsolute(moduleId)) {
                moduleId = eResolver.resolveSync({}, context, moduleId);
            }
            return moduleId;
        },
        fileProcessor
    };
}
