"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var stylable_1 = require("stylable"); //peer
var path = require("path");
var deindent = require('deindent');
var murmurhash = require('murmurhash');
var loaderUtils = require('loader-utils');
/* must be flat */
exports.defaults = {
    namespacelessPrefix: 's'
};
// const importRegExp = /:import\(["']?(.*?)["']?\)/gm;
var relativeImportRegExp = /:import\(["']?(\.\/)(.*?)["']?\)/gm;
function resolveImports(source, context) {
    var importMapping = {};
    var resolved = source.replace(relativeImportRegExp, function (match, rel, thing) {
        var relativePath = rel + thing;
        var fullPath = path.resolve(context, relativePath);
        importMapping[relativePath] = fullPath;
        importMapping[fullPath] = relativePath;
        return match.replace(relativePath, fullPath);
    });
    return { resolved: resolved, importMapping: importMapping };
}
exports.resolveImports = resolveImports;
function createStylesheetWithNamespace(source, path, options) {
    var cssObject = stylable_1.objectifyCSS(source);
    var atNS = cssObject['@namespace'];
    var ns = Array.isArray(atNS) ? atNS[atNS.length - 1] : atNS;
    var namespace = (ns || options.namespacelessPrefix) + murmurhash.v3(path);
    return new stylable_1.Stylesheet(cssObject, namespace, source);
}
exports.createStylesheetWithNamespace = createStylesheetWithNamespace;
function createImportString(importDef, path) {
    var imports = importDef.defaultExport ? ["var " + importDef.defaultExport + " = require(\"" + (path) + "\");"] : [];
    for (var k in importDef.named) {
        imports.push("var " + importDef.defaultExport + " = require(\"" + (path) + "\")[" + JSON.stringify(importDef.named[k]) + "];");
    }
    return imports.join('\n');
}
exports.createImportString = createImportString;
function justImport(importDef, path) {
    return "require(\"" + path + "\");";
}
exports.justImport = justImport;
function transformStylableCSS(xt, source, resourcePath, context, resolver, options) {
    var _a = resolveImports(source, context), resolved = _a.resolved, importMapping = _a.importMapping;
    var sheet = createStylesheetWithNamespace(resolved, resourcePath, options);
    var namespace = sheet.namespace;
    var gen = new stylable_1.Generator({ resolver: resolver });
    gen.addEntry(sheet, false);
    var css = gen.buffer;
    var imports = sheet.imports.map(function (importDef) {
        return justImport(null, importMapping[importDef.from]);
        // return createImportString(importDef, importMapping[importDef.from]);
    });
    var code = (_b = ["    \n    ", "\n    exports = module.exports = require(", ").default(\n        ", ", \n        ", ",\n        ", "\n    );\n  "], _b.raw = ["    \n    ", "\n    exports = module.exports = require(", ").default(\n        ", ", \n        ", ",\n        ", "\n    );\n  "], deindent(_b, imports.join('\n'), JSON.stringify(require.resolve("./smallsheet.js")), JSON.stringify(namespace), JSON.stringify(sheet.classes), JSON.stringify(css.join('\n'))));
    return { sheet: sheet, code: code };
    var _b;
}
exports.transformStylableCSS = transformStylableCSS;
function escapepath(path) {
    return path.replace(/\\/gm, '\\').replace(/"/gm, '\"');
}
