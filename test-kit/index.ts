import path = require('path');
import { expect } from 'chai';
import MemoryFileSystem = require('memory-fs');
import * as postcss from 'postcss';
import { StylablePlugin } from '../src/webpack-loader';
import { StylableIntegrationOptions } from '../src/options';
import { memoryFS } from "./mem-fs";
import webpack = require('webpack');
const runtime = require('stylable/runtime');
const _eval = require('node-eval');


export interface fileMap {
    [fullpath: string]: string;
}

export interface WebpackTestConfig {
    files: fileMap;
    config: webpack.Configuration;
    allowErrors?: boolean;
    stylableConfig?: Partial<StylableIntegrationOptions>;
}

export interface WebpackTestResults {
    stats: webpack.Stats & { compilation: any };
    compiler: webpack.Compiler;
    fs: MemoryFileSystem
}
 
export function registerMemFs(compiler: any, memfs: MemoryFileSystem) {
    compiler.inputFileSystem = memfs;
    compiler.resolvers.normal.fileSystem = memfs;
    compiler.resolvers.context.fileSystem = memfs;
    compiler.outputFileSystem = memfs;
}

export function jsThatImports(fileList: string[]) {
    return `module.exports = {${fileList.map((fileName: string) => {
        let noExt = fileName;
        if (noExt.indexOf('./') == 0) {
            noExt = noExt.slice(2);
        }

        noExt = noExt.replace(/\.st\.css$/, '').replace(/\.js$/, '');

        return ` "${noExt}" : require("${fileName}"),
            `
    }).join('')}}`;
}

export function getAssetSource(stats: any, asset: string) {
    return stats.compilation.assets[asset].source();
}

export function haveExportsSorted(cssModule: any, _exports: string[]) {
    expect(Object.keys(cssModule).filter((s) => s !== '$stylesheet').sort()).to.eql(_exports)
}

export function matchRules(css: string, tests: Array<string | RegExp>) {
    tests = tests.slice();
    let msg: string | boolean = false;
    postcss.parse(css).walkRules((rule) => {
        const testSelector = tests.shift()!;
        if (typeof testSelector === 'string') {
            if (rule.selector !== testSelector && !msg) {
                msg = `${rule.selector} is not match to ${testSelector}`
            }
        } else {
            if (!rule.selector.match(testSelector) && !msg) {
                msg = `${rule.selector} is not match to ${testSelector}`
            }
        }
    });
    if (msg === false) {
        msg = true;
    }
    expect(msg, 'rules matches selectors').to.equal(true)
    return true;
}

export function evalCssJSModule(source: string, filename: string = 'file.js') {
    return _eval(source, filename, {
        require(id: string) {
            if (id === "stylable/runtime") {
                return runtime;
            }
            return '';
        }
    });
}


export function createFS(files: { [k: string]: string }) {
    const memfs = memoryFS();

    const defaults: fileMap = {
        '/node_modules/stylable/runtime/index.js': `
            module.exports.create = ${runtime.create.toString()}
        `,
        '/package.json': `

            {
                "name": "test"
            }

        `
    }
    for (var k in defaults) {
        var r = path.resolve(k);
        memfs.mkdirpSync(path.dirname(r));
        memfs.writeFileSync(r, defaults[k] || '\n');
    }

    for (var k in files) {
        var r = path.resolve(k);
        memfs.mkdirpSync(path.dirname(r));
        memfs.writeFileSync(r, files[k] || '\n');
    }

    return memfs;
}


export function createWebpackCompiler(webpackConfig: webpack.Configuration, fs: MemoryFileSystem, stylableConfig: Partial<StylableIntegrationOptions> = {}) {

    webpackConfig = { ...webpackConfig };
    const output = webpackConfig.output;
    delete webpackConfig.output;

    const compiler = webpack({
        context: path.resolve('/'),
        entry: '',
        output: {
            publicPath: '/',
            path: '/dist',
            filename: '[name].js',
            ...output
        },
        plugins: [
            // {
            //     apply(compiler: any){
            //         compiler.inputFileSystem = fs;
            //         compiler.outputFileSystem = fs;
            //     }
            // },
            new StylablePlugin({ requireModule() { throw new Error('Implement require in test') }, ...stylableConfig })
        ],
        module: {
            rules: [
                {
                    test: /\.st\.css$/,
                    use: [
                        {
                            loader: path.join(process.cwd(), 'webpack-loader')
                        }
                    ]
                }, {
                    test: /\.(png|jpg|gif|svg)$/,
                    use: [
                        {
                            loader: path.join(process.cwd(), 'node_modules', 'url-loader'),
                            options: {
                                limit: 1
                            }
                        }
                    ]
                }
            ]
        },
        ...webpackConfig
    });

    registerMemFs(compiler, fs);

    return compiler;
}


export function webpackTest({ files, config, stylableConfig, allowErrors }: WebpackTestConfig) {

    const fs = createFS(files);

    const compiler = createWebpackCompiler(config, fs, stylableConfig);

    return {
        compiler,
        fs,
        evalCssJSModule,
        resolve(paths: string[]) {
            return paths.map((p) => path.resolve(p));
        },
        async run(): Promise<WebpackTestResults> {
            return new Promise<WebpackTestResults>((resolve, reject) => {

                compiler.run((error: Error, stats: webpack.Stats) => {
                    if (error || (stats.hasErrors() && !allowErrors)) {
                        if (!error) {
                            error = new Error((stats as any).compilation.errors.map((err: any) => err.message).join('\n'))
                        }
                        reject(error);
                    } else {
                        resolve({ stats: stats as any, compiler, fs });
                    }
                });

            })
        }
    }

}
