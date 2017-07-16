var stylable = require('stylable'); //peer
var deindent = require('deindent');
var path = require('path');
var murmurhash = require('murmurhash');

/* must be flat */
const defaults = {
  namespacelessPrefix: 's'
};

// const importRegExp = /:import\(["']?(.*?)["']?\)/gm;
const relativeImportRegExp = /:import\(["']?(\.\/)(.*?)["']?\)/gm;

function resolveImports(source, context) {
  const importMapping = {};
  const resolved = source.replace(relativeImportRegExp, (match, rel, thing) => {
    const relativePath = rel + thing;
    const fullPath = path.resolve(context, relativePath);
    importMapping[relativePath] = fullPath;
    importMapping[fullPath] = relativePath;
    return match.replace(relativePath, fullPath);
  });

  return { resolved, importMapping };
}

function createStylesheetWithNamespace(source, path, options) {
  const cssObject = stylable.objectifyCSS(source);
  const atNS = cssObject['@namespace'];
  const ns = Array.isArray(atNS) ? atNS[atNS.length - 1] : atNS;
  const namespace = (ns || options.namespacelessPrefix) + murmurhash.v3(path);
  return new stylable.Stylesheet(cssObject, namespace, source);
}

function createImportString(importDef, path) {
  var imports = importDef.defaultExport ? [`var ${importDef.defaultExport} = require(${JSON.stringify(path)})`] : [];
  for (var k in importDef.named) {
    imports.push(`var ${importDef.defaultExport} = require(${JSON.stringify(path)})[${JSON.stringify(importDef.named[k])}]`);
  }
  return imports;
}

function transformStylableCSS(source, resourcePath, context, resolver, options) {

  const { resolved, importMapping } = resolveImports(source, context);
  const sheet = createStylesheetWithNamespace(resolved, resourcePath, options);
  const namespace = sheet.namespace;

  const gen = new stylable.Generator({ resolver: resolver });

  gen.addEntry(sheet, false);

  const css = gen.buffer;

  const imports = sheet.imports.map((importDef) => {
    return createImportString(importDef, importMapping[importDef.from]);
  });

  const code = deindent`    
    ${imports.join('\n')}
    module.exports = require(${path.join(__dirname, 'smallsheet.js')})(
        ${JSON.stringify(namespace)}, 
        ${JSON.stringify(sheet.classes)},
        ${JSON.stringify(css.join('\n'))}
    );
  `;

  return { sheet, code };

}




var fs = require('fs');
var loaderUtils = require('loader-utils');

module.exports = function (source) {
  const options = Object.assign({}, defaults, loaderUtils.getOptions(this));

  const resolver = new stylable.Resolver({});
  resolver.resolveModule = function (path) {
    return createStylesheetWithNamespace(fs.readFileSync(path), path, options);
  }

  const { sheet, code } = transformStylableCSS(source, this.resourcePath, this.context, resolver, options);

  this.addDependency('stylable');
  sheet.imports.forEach((importDef) => {
    this.addDependency(importDef.from);
  });

  return code;
};


