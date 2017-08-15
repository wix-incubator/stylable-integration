#!/usr/bin/env node
import fs = require('fs');
import { FSResolver } from "./fs-resolver";
import {build} from './builder';
const glob = require('glob');

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
const resolver = new FSResolver('s',cwd);

log('[Arguments]',argv);

build(match,fs,resolver,outDir,srcDir,cwd,glob,log);

function createLogger(prefix: string, shouldLog: boolean) {
    return function log(...messages: string[]) {
        if (shouldLog) {
            console.log(prefix, ...messages);
        }
    }
}
