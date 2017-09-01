import { createCSSModuleString, replaceAssetsAsync } from './stylable-transform';
import { Stylable, Bundler, StylableResults } from 'stylable';
import { StylableIntegrationDefaults, StylableIntegrationOptions } from './options';
import loaderUtils = require('loader-utils');
import * as webpack from 'webpack';
import { ConcatSource, RawSource } from 'webpack-sources';

let firstRun: boolean = true;
let bundler: Bundler | null = null;
let stylable: Stylable | null = null;


export function loader(this: webpack.loader.LoaderContext, _source: string) {
    this.addDependency('stylable');

    let results: StylableResults;
    const options = { ...StylableIntegrationDefaults, ...loaderUtils.getOptions(this) };

    const oldSheets = bundler ? bundler.getDependencyPaths().reduce<{ [s: string]: boolean }>((acc, path) => {
        acc[path] = true;
        return acc;
    }, {}) : {};

    if (!bundler) {
        stylable = new Stylable(this.options.context, this.fs, options.requireModule || require, options.nsDelimiter);
        bundler = stylable.createBundler();
    }

    bundler.addUsedFile(this.resourcePath);

    const publicPath = this.options.output.publicPath || '//assets';
    const addedSheetList = bundler.getDependencyPaths().filter(path => !oldSheets[path]);
    return Promise.all(addedSheetList.map(newSheetPath => {
        const newSheetSrc = this.fs.readFileSync(newSheetPath).toString();
        return replaceAssetsAsync(newSheetSrc, (relativeUrl: string) => {
            return new Promise<string>((resolve) => {
                this.addDependency(relativeUrl);
                //seems to be an error in webpack d.ts
                (this as any).loadModule(relativeUrl, (err: Error | null, data: string) => {
                    if (data && !err) {
                        const mod = { exports: '' };
                        Function("module", "__webpack_public_path__", data)(mod, publicPath)
                        resolve(mod.exports);
                    } else {
                        resolve(relativeUrl);
                    }
                })
            });
        }).then(modifiedSource => {
            const res = stylable!.transform(modifiedSource, newSheetPath);
            stylable!.fileProcessor.add(newSheetPath, res.meta);
            if (newSheetPath === this.resourcePath) {
                results = res;
            }
        });

    })).then(() => {
        let code = `throw new Error('Cannot load module: "${this.resourcePath}"')`;
        if (!results) { throw new Error(`There is no results for ${this.resourcePath}`); }
        try {
            code = createCSSModuleString(results.exports, results.meta, options);
            if (options.injectBundleCss && !firstRun) {
                code += `\n;window.refreshStyleSheet('${getRandomString()}');\n`;
            }
        } catch (err) {
            console.error(err.message, err.stack);
        }
        return code;
    })

};

export class Plugin {
    private options: StylableIntegrationOptions;
    constructor(options: Partial<StylableIntegrationOptions>) {
        this.options = { ...StylableIntegrationDefaults, ...options };
    };
    apply = (compiler: webpack.Compiler) => {
        compiler.plugin('run', (_compilation, callback) => {
            firstRun = true;
            callback();
        });
        compiler.plugin('emit', (compilation, callback) => {

            firstRun = false;

            compilation.chunks.forEach((chunk: any) => {

                const bundleName = compilation.getPath(compilation.options.output.filename, {
                    hash: compilation.hash,
                    chunk
                });

                const bundleCssName = compilation.getPath(this.options.filename, {
                    hash: compilation.hash,
                    chunk
                });

                if (this.options.injectBundleCss) {
                    this.addBundleInjectionCode(compilation, bundleName, bundleCssName);
                }

                // bundle css
                const resultCssBundle = bundler!.generateCSS(this.getSortedStylableModulesList(chunk));

                compilation.assets[bundleCssName] = new RawSource(resultCssBundle);
            });

            bundler = stylable = null;
            callback();
        });
    }
    getSortedStylableModulesList(chunk: any){
        const usedSheetPaths: string[] = [];
        chunk.forEachModule(({ resource }: { resource: string }) => {
            //TODO: replace the regexp with option
            resource && resource.match(/\.css$/) && usedSheetPaths.push(resource);
        });
        return usedSheetPaths.reverse();
    }
    addBundleInjectionCode(compilation: any, bundleName: string, bundleCssName: string) {
        const publicPath = compilation.options.output.publicPath || '';
        const cssBundleLocation = publicPath + bundleCssName;
        const bundleAddition = `(function() {
            if (typeof document !== 'undefined') {
                window.refreshStyleSheet = function(queryBuster) {
                    var style = document.getElementById('cssBundle');
                    if(!style){
                        style = document.createElement('link');
                        style.id = "cssBundle";
                        style.setAttribute('rel','stylesheet');
                        style.setAttribute('href','${cssBundleLocation}');
                        document.head.appendChild(style);
                    } else {
                        style.setAttribute('href','${cssBundleLocation}?queryBuster=' + queryBuster);
                    }
                }
                window.refreshStyleSheet("${getRandomString()}");
            }
        })()`;

        compilation.assets[bundleName] = new ConcatSource(bundleAddition, ' ,', compilation.assets[bundleName]);

    }
}


function getRandomString() {
    return Math.random().toString().slice(2);
}
