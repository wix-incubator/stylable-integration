import { StylableMeta } from 'stylable';
const deindent = require('deindent');
import { StylableIntegrationDefaults, StylableIntegrationOptions } from './options';


export function createCSSModuleString(exports: any, meta: StylableMeta, options: StylableIntegrationOptions = StylableIntegrationDefaults): string {
    
    const root = JSON.stringify(meta.root);
    const namespace = JSON.stringify(meta.namespace);
    const locals = JSON.stringify(exports);

    const runtimePath = 'stylable/runtime';

    // ${imports.join('\n')}
    let code: string = '';
    if (options.injectFileCss) {
        const css = JSON.stringify(meta.outputAst!.toString());

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

    return code;
}



const relativeImportAsset = /url\s*\(\s*["']?([^:]*?)["']?\s*\)/gm;


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
