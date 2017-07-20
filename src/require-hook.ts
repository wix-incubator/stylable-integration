import { readFileSync } from "fs";
import { relative, dirname } from "path";

import { transformStylableCSS } from "./stylable-transform";
import { FSResolver } from "./fs-resolver";

export interface Options {
    extension: string;
    afterCompile?: (code: string, filename: string) => string;
}

export function attachHook({ extension, afterCompile }: Options) {
    const existingHook = require.extensions[extension];
    require.extensions[extension] = function cssModulesHook(m: any, filename: string) {
        const options = { defaultPrefix: 's', standalone: true };
        const source = readFileSync(filename, 'utf8');
        const { code, sheet } = transformStylableCSS(source, filename, relative('.', dirname(filename)), new FSResolver(options.defaultPrefix), options);
        return m._compile(afterCompile ? afterCompile(code, filename) : code, filename);
    };
};
