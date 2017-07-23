import { readFileSync } from 'fs';
import { dirname } from 'path';
import { Resolver } from 'stylable'; //peer
import { createStylesheetWithNamespace, resolveImports } from './stylable-transform';

export class FSResolver extends Resolver {
    constructor(private prefix: string) {
        super({});
    }
    resolveModule(path: string) {
        var resolved;
        if (path.match(/\.css$/)) {
            resolved = createStylesheetWithNamespace(
                resolveImports(readFileSync(path, 'utf8'), dirname(path)).resolved,
                path,
                this.prefix
            );
        } else {
            resolved = require(path);
        }

        return resolved;
    }
}
