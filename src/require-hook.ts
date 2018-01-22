import * as fs from "fs";
import {stylableToModuleFactory} from './stylable-to-module-factory';

export interface Options {
    extension: string;
    nsDelimiter: string;
    afterCompile?: (code: string, filename: string) => string;
}

export function attachHook({ extension, afterCompile, nsDelimiter }: Partial<Options>) {
    extension = extension || '.css';
    const stylableToModule = stylableToModuleFactory(fs, require, nsDelimiter);
    
    require.extensions[extension] = function cssModulesHook(m: any, filename: string) {
        const source = fs.readFileSync(filename).toString();
        const code = stylableToModule(source, filename);
        return m._compile(afterCompile ? afterCompile(code, filename) : code, filename);
    };
};
