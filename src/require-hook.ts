import * as fs from "fs";

import { createCSSModuleString } from "./stylable-transform";
import { Stylable } from "./fs-resolver";
import {StylableIntegrationOptions,StylableIntegrationDefaults} from './options';


export interface Options extends StylableIntegrationOptions {
    extension: string;
    afterCompile?: (code: string, filename: string) => string;
}

export function attachHook({ extension, afterCompile, nsDelimiter }: Options) {
    extension = extension || '.css';
    const options:StylableIntegrationOptions = {...StylableIntegrationDefaults, injectFileCss: true, injectBundleCss:false};
    
    const stylable = new Stylable('root', fs, require, nsDelimiter);

    require.extensions[extension] = function cssModulesHook(m: any, filename: string) {
        const source = fs.readFileSync(filename).toString();
        const {exports, meta} = stylable.transform(source, filename)
        const code = createCSSModuleString(exports, meta, options);
        return m._compile(afterCompile ? afterCompile(code, filename) : code, filename);
    };
};
