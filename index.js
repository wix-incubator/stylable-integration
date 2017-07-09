var path = require('path');
var loaderUtils = require('loader-utils');
var stylable = require('stylable');

module.exports = function(source) {
  const options = loaderUtils.getOptions(this);
  this.addDependency('stylable');  
  return `
    Object.defineProperty(exports, "__esModule", { value: true });
    module.exports.default = require('stylable/react').Stylesheet.fromCSS(${JSON.stringify(source)});
  `;
};
