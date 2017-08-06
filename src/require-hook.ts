import { readFileSync } from "fs";
import { relative, dirname } from "path";

import { transformStylableCSS } from "./stylable-transform";
import { FSResolver } from "./fs-resolver";
import {StylableIntegrationOptions,StylableIntegrationDefaults} from './options';


export interface Options extends StylableIntegrationOptions {
    extension: string;
    afterCompile?: (code: string, filename: string) => string;
}

export function attachHook({ extension, afterCompile ,assetsDir, assetsServerUri}: Options) {
    extension = extension || '.css';
    const existingHook = require.extensions[extension];
    const options:StylableIntegrationOptions = {...StylableIntegrationDefaults, ...{ injectFileCss: true , assetsDir,assetsServerUri,injectBundleCss:false}};
    const resolver = new FSResolver(options.defaultPrefix,'root');
    require.extensions[extension] = function cssModulesHook(m: any, filename: string) {
        const source = readFileSync(filename, 'utf8');
        const { code, sheet } = transformStylableCSS(source, filename, relative('.', dirname(filename)), resolver,'root', options);
        return m._compile(afterCompile ? afterCompile(code, filename) : code, filename);
    };
};
