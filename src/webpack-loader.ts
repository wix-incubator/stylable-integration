import { createCSSModuleString, replaceAssetsAsync } from './stylable-transform';
import { Stylable, Bundler, StylableResults } from 'stylable';
import { StylableIntegrationDefaults, StylableIntegrationOptions } from './options';
import loaderUtils = require('loader-utils');
import webpack = require('webpack');

let firstRun: boolean = true;
let bundler: Bundler | null = null;
let stylable: Stylable | null = null;


function createIsUsedComment(ns: string) {
    return '\n//*stylable*' + ns + '*stylable*';
}

export function loader(this: webpack.loader.LoaderContext, _source: string) {
    let results:StylableResults;
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
        })
            .then(modifiedSource => {
                const res = stylable!.transform(modifiedSource, newSheetPath);
                stylable!.fileProcessor.add(newSheetPath, res.meta);
                if (newSheetPath === this.resourcePath) {
                    results = res;
                }
            });
    }))
        .then(() => {
            let code = `throw new Error('Cannot load module: "${this.resourcePath}"')`;
            try {
                if(!results){
                    throw new Error(`There is no results for ${this.resourcePath}`);
                }
                code = createCSSModuleString(results.exports, results.meta, options);
                if (options.injectBundleCss && !firstRun) {
                    const rand = Math.random();
                    code += '\nwindow.refreshStyleSheet(' + rand + ');\n'
                }
                code = code + createIsUsedComment(this.resourcePath);
                this.addDependency('stylable');
            } catch (err) {
                console.error(err.message, err.stack);
            }
            return code;
        })

};

export class Plugin {
    constructor(private options: StylableIntegrationOptions) {
    };
    apply = (compiler: webpack.Compiler) => {
        compiler.plugin('run', (_compilation, callback) => {
            firstRun = true;
            callback();
        })
        compiler.plugin('emit', (compilation, callback) => {

            firstRun = false;
            const entryOptions: string | { [key: string]: string | string[] } | undefined | string[] = compiler.options.entry;
            let entries: { [key: string]: string | string[] } = typeof entryOptions === 'object' ? entryOptions as any : { 'bundle': entryOptions };
            let simpleEntries: { [key: string]: string } = {};
            Object.keys(entries).forEach((entryName: string) => {
                const entry = entries[entryName];
                if (Array.isArray(entry)) {
                    simpleEntries[entryName] = entry[entry.length - 1];
                } else {
                    simpleEntries[entryName] = entry;
                }
            })
            // const options = { ...StylableIntegrationDefaults, ...this.options };
            // const resolver = createResolver(compilation.options.context, compilation.inputFileSystem);// new FSResolver(options.defaultPrefix,compilation.options.context,compilation.inputFileSystem);
            Object.keys(simpleEntries).forEach(entryName => {
                const outputFormat = compilation.options.output.filename;
                const bundleName = outputFormat.replace('[name]', entryName);
                const bundleCssName = bundleName.lastIndexOf('.js') === bundleName.length - 3 ? bundleName.slice(0, bundleName.length - 3) + '.css' : bundleName + '.css';
                const entryContent = compilation.assets[bundleName].source();
                if (this.options.injectBundleCss) {
                    const publicPath = compilation.options.output.publicPath || '';
                    const cssBundleLocation = publicPath + bundleCssName;
                    const bundleAddition = `(()=>{if (typeof document !== 'undefined') {
                        window.refreshStyleSheet = ()=>{
                            style = document.getElementById('cssBundle');
                            if(!style){
                                style = document.createElement('link');
                                style.id = "cssBundle";
                                style.setAttribute('rel','stylesheet');
                                style.setAttribute('href','${cssBundleLocation}');
                                document.head.appendChild(style);
                            }else{
                                style.setAttribute('href','${cssBundleLocation}?queryBuster=${Math.random()}');
                            }
                        }
                        window.refreshStyleSheet();
                    }})()`
                    const revisedSource = bundleAddition + ' ,' + compilation.assets[bundleName].source();
                    compilation.assets[bundleName] = {
                        source: function () {
                            return new Buffer(revisedSource, "utf-8")
                        },
                        size: function () {
                            return Buffer.byteLength(revisedSource, "utf-8");
                        }
                    }
                }

                let compilationBundler = <Bundler>bundler;

                const usedSheetPaths = compilationBundler.getUsedFilePaths().reduce<string[]>((acc, path) => {
                    const idComment = createIsUsedComment(path);
                    if (entryContent.indexOf(idComment) !== -1) {
                        acc.push(path);
                    }
                    return acc;
                }, []);

                const resultCssBundle = compilationBundler.generateCSS(usedSheetPaths);

                compilation.assets[bundleCssName] = {
                    source: function () {
                        return new Buffer(resultCssBundle, "utf-8")
                    },
                    size: function () {
                        return Buffer.byteLength(resultCssBundle, "utf-8");
                    }
                }

            });
            bundler = stylable = null;
            callback();
        });
    }
}
