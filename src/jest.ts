import * as fs from "fs";
const module = require('module');

import { createCSSModuleString } from "./stylable-transform";
import { Stylable } from "stylable";


const stylable = new Stylable('root', fs, require);

export function process(src: any, path: string) {
  const options = { injectFileCss: true };

  let code = src;
  const res = stylable.transform(src, path)
  code = createCSSModuleString(res, options);

  return code;
  // return module._compile(code, path);
}