import { readFileSync } from 'fs';
import { Resolver } from 'stylable'; //peer
import { createStylesheetWithNamespace } from './stylable-transform';

export class FSResolver extends Resolver {
    constructor(private prefix: string) {
        super({});
    }
    resolveModule(path: string) {
        if (path.match(/\.css$/)) {
            return createStylesheetWithNamespace(
                readFileSync(path, 'utf8'),
                path,
                this.prefix
            );
        } else {
            return require(path);
        }
    }
}
