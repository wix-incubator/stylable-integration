import { process, StylableTransformer, StylableResults, Diagnostics, safeParse, StylableMeta } from 'stylable';

const deindent = require('deindent');

import { StylableIntegrationDefaults, StylableIntegrationOptions } from './options';
import { NewResolver } from "./fs-resolver";


const relativeImportAsset = /url\s*\(\s*["']?([^:]*?)["']?\s*\)/gm;


export function generate(source: string, resourcePath: string, delimiter: string, resolver: NewResolver): StylableResults {
    const diagnostics = new Diagnostics();
    const root = safeParse(source, { from: resourcePath });
    const meta = process(root, diagnostics);
    const transformer = new StylableTransformer({ delimiter, diagnostics, ...resolver });
    resolver.fileProcessor.add(meta.source, meta);
    return transformer.transform(meta);
}

export interface Output {
    code: string;
    sheet: StylableMeta;
}

export function transformStylableCSS(source: string, resourcePath: string, resolver: NewResolver, options: StylableIntegrationOptions = StylableIntegrationDefaults): Output {

    const { exports, meta } = generate(source, resourcePath, options.nsDelimiter, resolver);

    const root = JSON.stringify(meta.root);
    const namespace = JSON.stringify(meta.namespace);
    const locals = JSON.stringify(exports);

    const runtimePath = 'stylable/runtime';

    // ${imports.join('\n')}
    let code: string = '';
    if (options.injectFileCss) {
        const css = JSON.stringify(meta.ast.toString());

        code = deindent`
        Object.defineProperty(exports, "__esModule", { value: true });
        module.exports.default = require("${runtimePath}").create(
            ${root},
            ${namespace},
            ${locals},
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
            ${locals},
            null,
            module.id
        );
        `;
    }

    return { sheet: meta, code };
}


export function getUsedAssets(source: string): string[] {
    const splitSource = source.split(relativeImportAsset);
    const res: string[] = [];
    splitSource.forEach((chunk, idx) => {
        if (idx % 2) {
            res.push(chunk);
        }
    })
    return res;
}

export function replaceAssetsAsync(source: string, resolveAssetAsync: (relativeUrl: string) => Promise<string>): Promise<string> {
    const splitSource = source.split(relativeImportAsset);
    return Promise.all(splitSource.map((srcChunk, idx) => {
        if (idx % 2) {
            return resolveAssetAsync(srcChunk).then((resolved) => `url("${resolved}")`);
        } else {
            return srcChunk;
        }
    })).then((modifiedSplitSource) => {
        return modifiedSplitSource.join('');
    })

}

export function justImport(path: string) {
    return `require("${path}");`;
}
