var path = require('path');
var fs = require('fs');
var loaderUtils = require('loader-utils');
var stylable = require('stylable');
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
  return new stylable.Stylesheet(cssObject, namespace);
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

  const code = `
    ${imports.join('\n')}
    var sheet = ${JSON.stringify(sheet.classes)}; 
    var style = document.head.querySelector("#${namespace}") || document.createElement('style');
    style.id = ${JSON.stringify(namespace)};
    style.textContent = ${JSON.stringify(css.join('\n'))} 
    document.head.appendChild(style);
    module.exports = {
      _kind: "Stylesheet", 
      get(n){return sheet[n]}, 
      cssStates(stateMapping){
        return stateMapping ? Object.keys(stateMapping).reduce(function(states, key) {
            if (stateMapping[key]) { states["data-" + ${JSON.stringify(namespace.toLowerCase())} + "-" + key.toLowerCase() ] = true; }
            return states;
        }, {}) : {};
        return {}
      }
    };
    module.exports.classes = sheet;
  `;

  return { sheet, code };

}

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


