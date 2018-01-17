import * as fs from "fs";
import * as path from 'path';

import { createCSSModuleString } from "./stylable-transform";
import { Stylable } from "stylable";

const stylable = new Stylable('root', fs, require);

function process(src: string, pathToFile: string) {
  const options = { injectFileCss: true };

  if (path.basename(pathToFile).endsWith('.st.css')) {
    const filename = path.basename(pathToFile, '.st.css');
    const res = stylable.transform(src, filename)
    const code = createCSSModuleString(res, options);
    return m._compile(afterCompile ? afterCompile(code, filename) : code, filename);
  }
  return src;
}