import * as console from 'console';
import { readFileSync } from 'fs';
import { Resolver } from 'stylable'; //peer
import { transformStylableCSS, createStylesheetWithNamespace, defaults } from './stylable-transform';

var loaderUtils = require('loader-utils');

export default function (this: any, source: string) {
  const options = { ...defaults, ...loaderUtils.getOptions(this) };

  const resolver = new Resolver({});
  resolver.resolveModule = function (path: string) {
    if(path.match(/\.css$/)){
      return createStylesheetWithNamespace(readFileSync(path, 'utf8'), path, options);
    } else {
      return require(path);
    }
  }

  const { sheet, code } = transformStylableCSS(source, this.resourcePath, this.context, resolver, options);

  this.addDependency('stylable');
  sheet.imports.forEach((importDef: any) => {
    this.addDependency(importDef.from);
  });

  return code;
};
