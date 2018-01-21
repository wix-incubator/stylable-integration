import * as fs from "fs";
import {process} from './jest';

export interface Options {
    extension: string;
    nsDelimiter: string;
    afterCompile?: (code: string, filename: string) => string;
}

export function attachHook({ extension, afterCompile, nsDelimiter }: Partial<Options>) {
    extension = extension || '.css';

    require.extensions[extension] = function cssModulesHook(m: any, filename: string) {
        const source = fs.readFileSync(filename).toString();
        const code = process(source, filename, nsDelimiter);
        return m._compile(afterCompile ? afterCompile(code, filename) : code, filename);
    };
};
