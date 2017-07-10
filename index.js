var path = require('path');
var loaderUtils = require('loader-utils');
var stylable = require('stylable');
var murmurhash = require('murmurhash')

const defaults = {
  namespacelessPrefix: 's'
};

module.exports = function (source) {
  const options = Object.assign({}, defaults, loaderUtils.getOptions(this));
  
  this.addDependency('stylable');
  
  const resourcePath = this.resourcePath;
  const sheet = stylable.Stylesheet.fromCSS(source);
  
  const namespace = (sheet.namespace || options.namespacelessPrefix) + murmurhash.v3(resourcePath);

  return `
    Object.defineProperty(exports, "__esModule", { value: true });
    const Stylesheet = require('stylable/react').Stylesheet;
    module.exports = new Stylesheet(${JSON.stringify(sheet.cssDefinition)}, ${JSON.stringify(namespace)});
    module.exports.default = module.exports;
  `;


};
