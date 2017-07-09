var path = require('path');
var loaderUtils = require('loader-utils');
var stylable = require('stylable');

module.exports = function(source) {
  const options = loaderUtils.getOptions(this);
  this.addDependency('stylable');  
  return `
    module.exports = require('stylable').Stylesheet.fromCSS(${JSON.stringify(source)});
  `;
};
