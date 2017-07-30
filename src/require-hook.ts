import { readFileSync } from "fs";
import { relative, dirname } from "path";

import { transformStylableCSS } from "./stylable-transform";
import { FSResolver } from "./fs-resolver";

export interface Options {
    extension: string;
    assetsDir:string;
    assetsUri:string;
    afterCompile?: (code: string, filename: string) => string;
}

export function attachHook({ extension, afterCompile ,assetsDir,assetsUri}: Options) {
    extension = extension || '.css';
    const existingHook = require.extensions[extension];
    const options = { defaultPrefix: 's', standalone: true ,assetsDir,assetsUri};
    const resolver = new FSResolver(options.defaultPrefix);
    require.extensions[extension] = function cssModulesHook(m: any, filename: string) {
        const source = readFileSync(filename, 'utf8');
        const { code, sheet } = transformStylableCSS(source, filename, relative('.', dirname(filename)), resolver, options);
        return m._compile(afterCompile ? afterCompile(code, filename) : code, filename);
    };
};
