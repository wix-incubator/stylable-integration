import { readFileSync } from 'fs';
import { transformStylableCSS, defaults } from './stylable-transform';
import { FSResolver } from "./fs-resolver";
import loaderUtils = require('loader-utils');

export function loader(this: any, source: string) {
    const options = { ...defaults, ...loaderUtils.getOptions(this) };

    const resolver = new FSResolver(options.defaultPrefix);

    const { sheet, code } = transformStylableCSS(
        source,
        this.resourcePath,
        this.context,
        resolver,
        options
    );

    this.addDependency('stylable');

    sheet.imports.forEach((importDef: any) => {
        this.addDependency(importDef.from);
    });

    return code;
};
