import { readFileSync } from "fs";

import { transformStylableCSS } from "./stylable-transform";
import { createResolver } from "./fs-resolver";
import {StylableIntegrationOptions,StylableIntegrationDefaults} from './options';


export interface Options extends StylableIntegrationOptions {
    extension: string;
    afterCompile?: (code: string, filename: string) => string;
}

export function attachHook({ extension, afterCompile }: Options) {
    extension = extension || '.css';
    const options:StylableIntegrationOptions = {...StylableIntegrationDefaults, injectFileCss: true, injectBundleCss:false};
    const resolver = createResolver('root') //TODO: check why its "root"

    require.extensions[extension] = function cssModulesHook(m: any, filename: string) {
        const source = readFileSync(filename).toString();
        const { code } = transformStylableCSS(source, filename, resolver, options);
        return m._compile(afterCompile ? afterCompile(code, filename) : code, filename);
    };
};
