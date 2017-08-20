#!/usr/bin/env node
import fs = require('fs');
import { FSResolver } from "./fs-resolver";
import {build} from './builder';

const argv = require('yargs')
    .option('rootDir')
    .describe('rootDir', 'root project directory')
    .default('rootDir', process.cwd(), 'process.cwd()')

    .option('srcDir')
    .describe('srcDir', 'source directory in working directory')
    .default('srcDir', '.', 'same as root directory')

    .option('outDir')
    .describe('outDir', 'output directory')
    .default('outDir', '.', 'same as root directory')

    .option('ext')
    .describe('ext', 'extension of stylable css files')
    .default('ext', '.st.css', '.st.css files')

    .option('log')
    .describe('log', 'should log to console')
    .default('log', true, 'silent')

    .alias('h', 'help')
    .help()
    .argv;


const log = createLogger("[Stylable]", argv.log);
const {outDir, srcDir, rootDir, ext} = argv;

const resolver = new FSResolver('s', rootDir);

log('[Arguments]',argv);

build({extension: ext, fs, resolver, outDir, srcDir, rootDir, log});

function createLogger(prefix: string, shouldLog: boolean) {
    return function log(...messages: string[]) {
        if (shouldLog) {
            console.log(prefix, ...messages);
        }
    }
}
