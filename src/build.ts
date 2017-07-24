#!/usr/bin/env node
import { transformStylableCSS } from "./stylable-transform";
import { FSResolver } from "./fs-resolver";
import { dirname, join } from "path";

const glob = require('glob');
const fs = require('fs-extra');

const argv = require('yargs')
    .option('outDir')
    .describe('outDir', 'output directory')
    .default('outDir', './', 'same as file path')
    
    .option('srcDir')
    .describe('srcDir', 'source directory in working directory')
    .default('srcDir', '.', 'same as working directory')
    
    .option('cwd')
    .describe('cwd', 'working directory')
    .default('cwd', process.cwd(), 'process.cwd()')
    
    .option('match')
    .describe('match', 'glob pattern to match stylable css files')
    .default('match', '**/*.st.css', '.st.css files')
    
    .alias('h', 'help')
    .help()
    .argv;

const outDir = argv.outDir;
const srcDir = argv.srcDir;
const cwd = argv.cwd;
const match = argv.match;
const fullSrcDir = join(cwd, srcDir);
const resolver = new FSResolver('s');

glob(match, {}, function (er: Error, files: string[]) {

    files.forEach((file) => {
        const fullpath = join(cwd, file);
        const content = fs.readFileSync(fullpath, 'utf8');
        const { code } = transformStylableCSS(content, fullpath, dirname(fullpath), resolver);
        const outPath = join(cwd, outDir, fullpath.replace(fullSrcDir, '') + '.js');
        fs.outputFileSync(outPath, code);
    });

});
