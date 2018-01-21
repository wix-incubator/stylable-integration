import * as fs from "fs";

import { createCSSModuleString } from "./stylable-transform";
import { Stylable } from "stylable";


module.exports = function() {
  return function process(src: any, path: string, nsDelimiter?: any) {
    const stylable = new Stylable('root', fs, require, nsDelimiter);
    const options = { injectFileCss: true };

    let code = src;
    const res = stylable.transform(src, path)
    code = createCSSModuleString(res, options);

    return code;
  }
}