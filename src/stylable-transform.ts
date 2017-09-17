const deindent = require('deindent');
import { StylableMeta } from 'stylable';

const runtimePath = 'stylable/runtime';

export function createCSSModuleString(locals: { [key: string]: string } & object, meta: StylableMeta, options: { injectFileCss: boolean }): string {

    const localsExports = JSON.stringify(locals);
    const root = JSON.stringify(meta.root);
    const namespace = JSON.stringify(meta.namespace);

    const imports: string[] = meta.imports.map((i) => justImport(i.fromRelative));

    let code: string = '';
    const css = options.injectFileCss ? JSON.stringify(meta.outputAst!.toString()) : 'null';

    code = deindent`
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
