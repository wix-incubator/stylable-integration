#!/usr/bin/env node
const argv = require('minimist')(process.argv.slice(2));
const path = require('path');
const glob = require('glob');
const fs = require('fs');


import { transformStylableCSS } from "./stylable-transform";
import { FSResolver } from "./fs-resolver";

const outDir = './';

glob(argv.match || '**/*.st.css', {}, function (er: Error, files: string[]) {
    const cwd = process.cwd();
    const resolver = new FSResolver('s');

    files.forEach((file) => {
        const fullpath = path.join(cwd, file);

        var content = fs.readFileSync(fullpath, 'utf8');

        var { code } = transformStylableCSS(content, fullpath, path.dirname(fullpath), resolver);

        fs.writeFileSync(path.join(cwd, argv.outDir || outDir, file + '.js'), code);

    });

});
