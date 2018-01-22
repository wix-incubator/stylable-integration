import * as fs from "fs";

import { createCSSModuleString } from "./stylable-transform";
import { Stylable } from "stylable";


export function stylableToModuleFactory(_fs = fs, _require = require, nsDelimiter?: any) {
  const stylable = new Stylable('root', _fs, _require, nsDelimiter);
  const options = { injectFileCss: true };

  return function stylableToModule(src: any, path: string) {
    let code = src;
    const res = stylable.transform(src, path)
    code = createCSSModuleString(res, options);

    return code;
  }
}