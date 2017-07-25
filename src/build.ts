#!/usr/bin/env node
import { transformStylableCSS } from "./stylable-transform";
import { FSResolver } from "./fs-resolver";
import { dirname, join } from "path";
import { htap } from "htap";

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

    .option('log')
    .describe('log', 'should log to console')
    .default('log', true, 'silent')

    .alias('h', 'help')
    .help()
    .argv;


const log = createLogger("[Stylable]", argv.log);
const outDir = argv.outDir;
const srcDir = argv.srcDir;
const cwd = argv.cwd;
const match = argv.match;
const fullSrcDir = join(cwd, srcDir);
const fullMatch = htap(srcDir, match);
const resolver = new FSResolver('s');

log('[Arguments]',argv);

glob(fullMatch, {}, function (er: Error, files: string[]) {

    files.forEach((file) => {
        const fullpath = join(cwd, file);
        const outPath = join(cwd, outDir, fullpath.replace(fullSrcDir, '') + '.js');
        log('[Build]', fullpath + ' --> ' + outPath);
        const content = tryRun(() => fs.readFileSync(fullpath, 'utf8'), 'Read File Error');
        const { code } = tryRun(() => transformStylableCSS(content, fullpath, dirname(fullpath), resolver), 'Transform Error');
        tryRun(() => fs.outputFileSync(outPath, code), 'Write File Error');
    });

});

function tryRun<T>(fn: () => T, errorMessage: string): T {
    try {
        return fn();
    } catch (e) {
        throw new Error(errorMessage + ': \n' + e.stack)
    }
}

function createLogger(prefix: string, shouldLog: boolean) {
    return function log(...messages: string[]) {
        if (shouldLog) {
            console.log(prefix, ...messages);
        }
    }
}
