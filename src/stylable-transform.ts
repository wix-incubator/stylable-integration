const deindent = require('deindent');
import { StylableResults } from 'stylable';

const runtimePath = 'stylable/runtime';

let globalVersion = 0;

export interface CreateModuleInput extends StylableResults {
    [key: string]: any;
}


export function createCSSModuleString(res: CreateModuleInput, options: { injectFileCss: boolean }): string {
    const { exports, meta } = res;
    const localsExports = JSON.stringify(exports);
    const root = JSON.stringify(meta.root);
    const namespace = JSON.stringify(meta.namespace);

    const imports: string[] = meta.imports.map((i) => i.fromRelative.match(/\.st\.css$/) ? justImport(i.fromRelative) : '');

    let code: string = '';
    const css = options.injectFileCss ? JSON.stringify(meta.outputAst!.toString()) : 'null';

    code = deindent`
        //${globalVersion++}
        Object.defineProperty(exports, "__esModule", { value: true });
        ${imports.join('\n')}
        module.exports.default = require("${runtimePath}").create(
            ${root},
            ${namespace},
            ${localsExports},
            ${css},
            module.id
        );
    `;

    return code;
}

function justImport(path: string) {
    return `require("${path}");`;
}
