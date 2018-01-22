const fs = require('fs');
exports.process = require('./dist/src/stylable-to-module-factory').stylableToModuleFactory(fs, require);
