import { StylableMeta } from 'stylable';
const deindent = require('deindent');
import { StylableIntegrationDefaults, StylableIntegrationOptions } from './options';

const runtimePath = 'stylable/runtime';

export function createCSSModuleString(locals: any, meta: StylableMeta, options: Partial<StylableIntegrationOptions> = StylableIntegrationDefaults): string {
    
    locals = JSON.stringify(locals);
    const root = JSON.stringify(meta.root);
    const namespace = JSON.stringify(meta.namespace);

    const imports: string[] = meta.imports.map((i)=>{
        return justImport(i.fromRelative, i.theme ? '' : '');
    });

    let code: string = '';
    if (options.injectFileCss) {
        const css = JSON.stringify(meta.outputAst!.toString());
        
        code = deindent`
        Object.defineProperty(exports, "__esModule", { value: true });
        ${imports.join('\n')}
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
        ${imports.join('\n')}
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



export const relativeImportAsset = /url\s*\(\s*["']?([^:]*?)["']?\s*\)/gm;


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

export async function replaceAssetsAsync(source: string, resolveAssetAsync: (relativeUrl: string) => Promise<string>): Promise<string> {
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

export function justImport(path: string, query: string = '') {
    return `require("${path}${query}");`;
}
