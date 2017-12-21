import { createCSSModuleString } from './stylable-transform';
import { Stylable, Bundler } from 'stylable';
import { StylableIntegrationDefaults, StylableIntegrationOptions } from './options';
import * as webpack from 'webpack';
import { RawSource, ConcatSource } from 'webpack-sources';
import { cssAssetsLoader } from './css-loader';

// import loaderUtils = require('loader-utils');
// const CommonJsRequireDependency = require('webpack/lib/dependencies/CommonJsRequireDependency');
// import { StylableBundleInjector } from './stylable-bundle-inject';
const deindent = require('deindent');

export interface StylableLoaderContext extends webpack.loader.LoaderContext {
    stylable: Stylable;
    usingStylable: Function;
    createStylableRuntimeModule?: typeof createCSSModuleString;
}

export async function loader(this: StylableLoaderContext, source: string) {
    if (this.cacheable) { this.cacheable() };
    const stylable = this.stylable;
    const createModule = this.createStylableRuntimeModule || createCSSModuleString;
    if (!stylable) {
        throw new Error('Stylable Loader: Stylable plugin must be provided in the webpack configuration');
    }

    this.usingStylable();

    const result = await cssAssetsLoader.call(this, source);
    try {
        const res = stylable.transform(result.source, this.resourcePath);
        return createModule(res, { injectFileCss: false });
    } catch (err) {
        console.error(err.message, err.stack);
        return `throw new Error('Cannot load module: ${JSON.stringify(this.resourcePath)}')`
    }
};

export class Plugin {
    private stylableLoaderWasUsed = false;

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
        const stylable = new Stylable(
            compiler.context,
            compiler.inputFileSystem,
            this.options.requireModule || require,
            this.options.nsDelimiter,
            undefined,
            undefined,
            this.options.transformHooks
        );
        return stylable;
    }
    apply(compiler: webpack.Compiler) {

        let stylable: Stylable;
        let bundler: Bundler;

        compiler.plugin('this-compilation', (compilation) => {
            let usingStylable = () => this.stylableLoaderWasUsed = true;
            stylable = stylable || this.createStylable(compiler);
            bundler = bundler || stylable.createBundler();

            compilation.plugin('normal-module-loader', (loaderContext: StylableLoaderContext) => {
                loaderContext.stylable = stylable;
                loaderContext.usingStylable = usingStylable;
                loaderContext.createStylableRuntimeModule = this.options.createStylableRuntimeModule;
            });

            if (this.options.skipBundle) { return; }

            compilation.plugin("optimize-tree", (chunks: any, _modules: any, callback: any) => {

                if (!this.stylableLoaderWasUsed) {
                    return callback(); //skip emit css bundle.
                }
                chunks.forEach((chunk: any) => {
                    if (chunk.name === null && chunk.id === null || chunk.parents.length > 0) {
                        return; //skip emit css bundle.
                    }
                    const pathContext = { chunk, hash: compilation.hash };

                    const cssBundleFilename = compilation.getPath(this.options.filename, pathContext);

                    const files = this.getSortedStylableModulesList(chunk);
                    const cssBundle = this.bundleCSS(compilation, bundler, files);

                    compilation.assets[cssBundleFilename] = new RawSource(cssBundle);
                    compilation.assets[cssBundleFilename].fromFiles = files;

                });

                callback();

            });

            compilation.plugin("additional-chunk-assets", (chunks: any[]) => {
                if (this.options.injectBundleCss || !this.stylableLoaderWasUsed) { return; /*skip emit css bundle.*/ }

                chunks.forEach((chunk: any) => {
                    if (chunk.name === null && chunk.id === null || chunk.parents.length > 0) {
                        return; //skip emit css bundle.
                    }
                    const pathContext = { chunk, hash: compilation.hash };

                    const cssBundleFilename = compilation.getPath(this.options.filename, pathContext);

                    chunk.files.push(cssBundleFilename);

                });

            });

            if (this.options.injectBundleCss) {
                this.setupMainTemplatePlugin(compilation);
                this.setupHotTemplatePlugin(compilation);
            }

        });

    }
    setupMainTemplatePlugin(compilation: any) {
        compilation.mainTemplate.plugin('startup', (source: string, chunk: any, _hash: string) => {
            if (!this.stylableLoaderWasUsed) { return source; }
            const pathContext = { chunk, hash: compilation.hash };
            const bundleCssName = compilation.getPath(this.options.filename, pathContext);
            const code = this.createInjectBundleCode(bundleCssName, compilation.assets[bundleCssName].source());
            return code + source;
        });
    }
    setupHotTemplatePlugin(compilation: any) {
        compilation.hotUpdateChunkTemplate.plugin("render", (modulesSource: any, modules: any[]/*, removedModules, hash, id*/) => {
            if (!this.stylableLoaderWasUsed) { return modulesSource; }
            const source = new ConcatSource();
            const map: any = {};

            modules.forEach((_module) => {
                _module.chunks && _module.chunks.forEach((c: any) => map[c.id] = c);
            });

            for (const chunkId in map) {
                const chunk = map[chunkId];
                const pathContext = { chunk, hash: compilation.hash };
                const bundleCssName = compilation.getPath(this.options.filename, pathContext);
                if (compilation.assets[bundleCssName]) {
                    source.add(this.createInjectBundleCode(bundleCssName, compilation.assets[bundleCssName].source(), modulesSource.source()));
                }
            }

            return source;
        });
    }
    bundleCSS(compilation: any, bundler: Bundler, bundleFiles: string[]) {
        let resultCssBundle = '';
        try {
            resultCssBundle = bundler.generateCSS(bundleFiles, (meta) => {
                const transformReports = meta.transformDiagnostics ? meta.transformDiagnostics.reports : [];
                meta.diagnostics.reports.concat(transformReports).forEach((report) => {
                    if (report.node) {
                        compilation.warnings.push(report.node.error(report.message, report.options).toString().replace('CssSyntaxError', 'Stylable'));
                    } else {
                        compilation.warnings.push(report.message);
                    }
                });
            });
        } catch (error) {
            if (error.path) {
                compilation.errors.push(`${error} "${error.path}"`);
            } else {
                compilation.errors.push(error);
            }
        }
        return resultCssBundle;
    }
    getSortedStylableModulesList(chunk: any, usedSheetPaths: string[] = []) {

        chunk.chunks && chunk.chunks.forEach((c: any) => {
            this.getSortedStylableModulesList(c, usedSheetPaths);
        });

        const modules: any[] = [];
        const stCssMatcher = /\.st\.css$/;
        const each = chunk.forEachModule ? chunk.forEachModule.bind(chunk) : chunk.modules.forEach.bind(chunk.modules);

        each((m: any) => { modules[modules.length] = m });

        modules.sort((a, b) => b.index2 - a.index2).forEach((_module: any) => {
            const resource = this.getStylableResource(_module, stCssMatcher);
            if (resource) {

                let inThisChunkAndImportedFromJS = _module.reasons.some((reason: any) => {
                    if (hasChunk(reason, chunk) && reason.module.resource && !reason.module.resource.match(stCssMatcher)) {
                        return true
                    }
                });

                if (inThisChunkAndImportedFromJS) {
                    usedSheetPaths.push(resource);
                }

            }
        });

        return usedSheetPaths//.reverse();
    }
    getStylableResource(_module: any, resourceMatcher: RegExp): string | null {
        const resource = _module.resource;
        return resource && resource.match(resourceMatcher) ? resource : null
    }
    createInjectBundleCode(id: string, css: string, returnValue = '') {
        id = JSON.stringify(id);
        css = JSON.stringify(css);
        return deindent`
        (function(){
            if (typeof document !== 'undefined') {
                var style = document.getElementById(${id});
                if(!style){
                    style = document.createElement('style');
                    style.id = ${id};
                    document.head.appendChild(style);
                }
                style.textContent = ${css};
            }
            return ${returnValue};
        }())
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

