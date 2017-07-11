var path = require('path');
var loaderUtils = require('loader-utils');
var stylable = require('stylable');
var murmurhash = require('murmurhash')

/* must be flat */
const defaults = {
  namespacelessPrefix: 's'
};

// const importRegExp = /:import\(["']?(.*?)["']?\)/gm;
const relativeImportRegExp = /:import\(["']?(\.\/)(.*?)["']?\)/gm;

function resolveImports(source, context) {
  return source.replace(relativeImportRegExp, (match, rel, thing) => {
    return match.replace(rel + thing, path.resolve(context, rel + thing));
  });
}

module.exports = function (source) {
  this.addDependency('stylable');

  const options = Object.assign({}, defaults, loaderUtils.getOptions(this));
  const resourcePath = this.resourcePath;
  const resolved = resolveImports(source, this.context);
  const sheet = stylable.Stylesheet.fromCSS(resolved);
  const namespace = (sheet.namespace || options.namespacelessPrefix) + murmurhash.v3(resourcePath);

  const imports = sheet.imports.map((importDef) => { 
    this.addDependency(importDef.from);
    return createImportString(importDef);
  });

  return `
    Object.defineProperty(exports, "__esModule", { value: true });   
    var Stylesheet = require('stylable/react').Stylesheet;
    var sheet = new Stylesheet(${JSON.stringify(stylable.objectifyCSS(resolved))}, ${JSON.stringify(namespace)}, ${JSON.stringify(resourcePath)});
    module.exports = sheet;
    module.exports.default = sheet;
  `;

};


function createImportString(importDef) {
  var a = [];
  if(importDef.defaultExport){
    a.push(importDef.defaultExport);
  }
  var b = [];
  for(var k in importDef.named){
    a.push(`${importDef.named} as ${k}`);
  }

  a.push(`{${b.join(',')}}`);
  
  
  return `import ${a.join(', ')} from ${JSON.stringify(importDef.from)}";`;
}