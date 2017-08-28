#!/usr/bin/env node
import fs = require('fs');
import { Stylable } from "./fs-resolver";
import { build } from './builder';

const argv = require('yargs')
    .option('rootDir')
    .describe('rootDir', 'root directory of project')
    .default('rootDir', process.cwd(), 'cwd')

    .option('srcDir')
    .describe('srcDir', 'source directory relative to root')
    .default('srcDir', '.')

    .option('outDir')
    .describe('outDir', 'target directory relative to root')
    .default('outDir', '.')

    .option('ext')
    .describe('ext', 'extension of stylable css files')
    .default('ext', '.st.css')

    .option('log')
    .describe('log', 'verbose log')
    .default('log', false)

    .alias('h', 'help')
    .help()
    .argv;


const log = createLogger("[Stylable]", argv.log);
const { outDir, srcDir, rootDir, ext } = argv;

log('[Arguments]', argv);

const stylable = new Stylable(rootDir, fs, require);

build({ extension: ext, fs, stylable, outDir, srcDir, rootDir, log });

function createLogger(prefix: string, shouldLog: boolean) {
    return function log(...messages: string[]) {
        if (shouldLog) {
            console.log(prefix, ...messages);
        }
    }
}
