import { Stylesheet, Generator, objectifyCSS, Resolver } from 'stylable';
import path = require('path');
import { htap } from "htap";
const deindent = require('deindent');
const murmurhash = require('murmurhash');

/* must be flat */
export const defaults = {
    defaultPrefix: 's',
    standalone: true,
    assetsDir:'my-assets',
    assetsUri:'//my-assets'
};

let currentOptions:typeof defaults;
//TODO: remove this regexps!!!!
const relativeImportRegExp1 = /:import\(["']?(\.\/)(.*?)["']?\)/gm;
const relativeImportRegExp2 = /-st-from\s*:\s*["'](\.\.?\/)(.*?)["']/gm;
const relativeImportAsset = /url\(s*(\.[^\)]+s*)\)/gm;

export function resolveImports(source: string, context: string) {
    const importMapping: { [key: string]: string } = {};
    const assetMapping: { [key: string]: string } = {}
    const resolved = source
        .replace(relativeImportRegExp1, replace)
        .replace(relativeImportRegExp2, replace)
        .replace(relativeImportAsset,replaceAsset);


    function replace(match: string, rel: string, thing: string) {
        const relativePath = rel + thing;
        const fullPath = path.resolve(htap(context, relativePath));
        importMapping[relativePath] = fullPath;
        importMapping[fullPath] = relativePath;
        return match.replace(relativePath, fullPath);
    }
    function replaceAsset(match: string, rel: string) {
        const distPath = path.resolve(htap(currentOptions.assetsDir, rel));
        const originPath = path.resolve(htap(context, rel));
        assetMapping[originPath] = distPath;
        return match.replace(rel, path.posix.resolve(currentOptions.assetsUri,rel));
    }
    return { resolved, importMapping ,assetMapping};
}


export function createStylesheetWithNamespace(source: string, path: string, prefix: string = defaults.defaultPrefix) {
    const cssObject = objectifyCSS(source);
    const atNS = cssObject['@namespace'];
    const ns = Array.isArray(atNS) ? atNS[atNS.length - 1] : atNS;
    const namespace = (ns || prefix) + murmurhash.v3(path).toString(36);
    return new Stylesheet(cssObject, namespace, path);
}

export function createImportString(importDef: any, path: string) {
    var imports = importDef.defaultExport ? [`var ${importDef.defaultExport} = require("${(path)}");`] : [];
    for (var k in importDef.named) {
        imports.push(`var ${importDef.defaultExport} = require("${(path)}")[${JSON.stringify(importDef.named[k])}];`);
    }
    return imports.join('\n');
}

export function justImport(path: string) {
    return `require("${path}");`;
}

export function transformStylableCSS(source: string, resourcePath: string, context: string, resolver: Resolver, options: typeof defaults = defaults) {

    currentOptions = options;
    const { resolved, importMapping, assetMapping } = resolveImports(source, context);
    const sheet = createStylesheetWithNamespace(resolved, resourcePath, options.defaultPrefix);

    const gen = new Generator({ resolver });
    gen.addEntry(sheet, false);

    const imports = sheet.imports.map((importDef: any) => {
        return justImport(importMapping[importDef.from]);
    });

    const root = JSON.stringify(sheet.root);
    const namespace = JSON.stringify(sheet.namespace);
    const classes = JSON.stringify(Object.assign({}, sheet.vars, sheet.classes));
    const css = JSON.stringify(gen.buffer.join('\n'));
    // const runtimePath = path.join(__dirname, "runtime").replace(/\\/gm, "\\\\");
    const runtimePath = 'stylable/runtime';
    // ${imports.join('\n')}
    let code: string
    if (options.standalone) {
        code = deindent`
            Object.defineProperty(exports, "__esModule", { value: true });
            module.exports.default = require("${runtimePath}").create(
                ${root},
                ${namespace},
                ${classes},
                ${css},
                module.id
            );
        `;

    } else {
        code = deindent`
            Object.defineProperty(exports, "__esModule", { value: true });
            ${imports.join('\n')}
            module.exports = [[module.id, ${css}, ""]];
            module.exports.default = module.exports.locals = require("${runtimePath}").create(
                ${root},
                ${namespace},
                ${classes},
                null,
                module.id
            );
        `;
    }

    return { sheet, code, assetMapping };

}
