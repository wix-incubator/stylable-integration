import { createCSSModuleString } from './stylable-transform';
import { Stylable, Bundler } from 'stylable';
import { StylableIntegrationDefaults, StylableIntegrationOptions } from './options';
// import loaderUtils = require('loader-utils');
import * as webpack from 'webpack';
import { RawSource } from 'webpack-sources';
import { cssLoader } from './css-loader';
const deindent = require('deindent');

export interface StylableLoaderContext extends webpack.loader.LoaderContext {
    stylable: Stylable
}

export function loader(this: StylableLoaderContext, source: string) {
    this.addDependency('stylable');
    if (this.cacheable) { this.cacheable() };

    const stylable = this.stylable;

    return cssLoader.call(this, source).then((s: any) => {

        try {
            const { meta, exports } = stylable.transform(s.source, this.resourcePath);
            return createCSSModuleString(exports, meta, { injectFileCss: false });
        } catch (err) {
            console.error(err.message, err.stack);
            return `throw new Error('Cannot load module: ${JSON.stringify(this.resourcePath)}')`
        }
    });

};

export class Plugin {
    private options: StylableIntegrationOptions;
    static loaders() {
        return [
            'stylable-integration/webpack-loader'
        ]
    }
    static rule(test: RegExp = /\.st\.css$/) {
        return {
            test,
            use: Plugin.loaders()
        }
    }
    constructor(options: Partial<StylableIntegrationOptions>) {
        this.options = { ...StylableIntegrationDefaults, ...options };
    };
    createStylable(compiler: any) {
        return new Stylable(compiler.context, compiler.inputFileSystem, this.options.requireModule || require, this.options.nsDelimiter);
    }
    apply(compiler: webpack.Compiler) {

        let stylable: Stylable;
        let bundler: Bundler;

        compiler.plugin('this-compilation', (compilation) => {
            stylable = stylable || this.createStylable(compiler);
            bundler = bundler || stylable.createBundler();

            compilation.plugin('normal-module-loader', (loaderContext: StylableLoaderContext) => {
                loaderContext.stylable = stylable;
            });

            compilation.plugin('optimize-tree', (chunks: any[], _: any, done: Function) => {

                chunks.forEach((chunk: any) => {
                    const pathContext = { chunk, hash: compilation.hash };
                    const cssBundleFilename = compilation.getPath(this.options.filename, pathContext);

                    const files = this.getSortedStylableModulesList(chunk);
                    const cssBundle = this.bundleCSS(compilation, bundler, files);

                    compilation.assets[cssBundleFilename] = new RawSource(cssBundle);
                    compilation.assets[cssBundleFilename].fromFiles = files;
                });

                done();
            });

            if (this.options.injectBundleCss) {
                compilation.mainTemplate.plugin('startup', (source: string, chunk: any, _hash: string) => {
                    const pathContext = { chunk, hash: compilation.hash };
                    const bundleCssName = compilation.getPath(this.options.filename, pathContext);
                    const code = this.injectBundle(bundleCssName, compilation.assets[bundleCssName].source());
                    return code + source;
                });
            }

        });

    }
    bundleCSS(compilation: any, bundler: Bundler, bundleFiles: string[]) {
        let resultCssBundle = '';
        try {
            resultCssBundle = bundler.generateCSS(bundleFiles);
        } catch (error) {
            if (error.path) {
                compilation.errors.push(`${error} "${error.path}"`);
            } else {
                compilation.errors.push(error);
            }
        }
        return resultCssBundle;
    }
    getSortedStylableModulesList(chunk: any) {
        const usedSheetPaths: string[] = [];
        const modules: any[] = [];
        const stCssMatcher = /\.st\.css$/;
        const each = chunk.forEachModule ? chunk.forEachModule.bind(chunk) : chunk.modules.forEach.bind(chunk.modules);

        each((m: any) => { modules[modules.length] = m });

        modules.sort((a, b) => b.index2 - a.index2).forEach((_module: any) => {
            const resource = _module.resource;
            if (resource && resource.match(stCssMatcher)) {

                let inThisChunkAndImportedFromJS = false;

                _module.reasons.forEach((reason: any) => {
                    if (hasChunk(reason, chunk) && reason.module.resource && !reason.module.resource.match(stCssMatcher)) {
                        inThisChunkAndImportedFromJS = true;
                    }
                });

                if (inThisChunkAndImportedFromJS) {
                    usedSheetPaths.push(resource);
                }

            }
        });

        return usedSheetPaths//.reverse();
    }
    injectBundle(id: string, css: string) {
        id = JSON.stringify(id);
        css = JSON.stringify(css);
        return deindent`
        if (typeof document !== 'undefined') {
            var style = document.getElementById(${id});
            if(!style){
                style = document.createElement('style');
                style.id = ${id};
                document.head.appendChild(style);
            }
            style.textContent = ${css};
        }
        `
    }

}


function hasChunk(reason: any, chunk: any) {
    //new webpack
    if (reason.hasChunk) {
        return reason.hasChunk(chunk);
    }
    //old webpack
    var c = reason._chunks || reason.chunks;
    var mc = reason.module ? (reason.module._chunks || reason.module.chunks) : null;

    if (c) {
        if (c.has(chunk)) {
            return true;
        }
    } else if (mc) {
        if (mc.has && mc.has(chunk)) {
            return true;
        }
        if (mc.indexOf && mc.indexOf(chunk) !== -1) {
            return true;
        }
    }
    return false;
}
