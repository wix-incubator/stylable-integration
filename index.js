var path = require('path');
var loaderUtils = require('loader-utils');



module.exports = function(source) {
  console.log(source);
  
  return `
    module.exports = {
      ABOOOOOOOOOOOOOOOO: "OOOOOYYYYYYYYYYYYYY"
    }
  `
};
