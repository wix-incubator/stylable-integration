import { safeParse } from 'stylable';
import * as webpack from 'webpack';
import * as postcss from 'postcss';
const Tokenizer = require('css-selector-tokenizer');
const loaderUtils = require('loader-utils');

export interface Results {
    source: string,
    css: postcss.Root,
    assets: string[],
    resolved: string[]
}

export function cssLoader(this: webpack.loader.LoaderContext, source: string): Promise<Results> {

    const css = safeParse(source, { from: this.resourcePath })

    const assets: string[] = [];
    const loading: Promise<string>[] = [];

    findUrls(css, (url: string) => {
        if (url.replace(/\s/g, '').length && !/^#/.test(url) && loaderUtils.isUrlRequest(url, '/')) {
            loading[loading.length] = loadAsset(this, url);
            return assets[assets.length] = url;
        }
        return url;
    });

    return Promise.all(loading).then((resolved) => {

        assets.forEach((asset: string, i: number) => {
            source = source.replace(asset, resolved[i])
        });

        return {
            source,
            css,
            assets,
            resolved
        };
    });

};


function loadAsset(ctx: webpack.loader.LoaderContext & { loadModule?: Function }, url: string): Promise<string> {
    const publicPath = ctx.options.output.publicPath || '';
    return new Promise((resolve) => {
        ctx.loadModule && ctx.loadModule(url, (err: Error | null, data: string) => {
            if (data && !err) {
                const mod = { exports: '' };
                Function("module", "__webpack_public_path__", data)(mod, publicPath)
                resolve(mod.exports);
            } else {
                resolve(url);
            }
        })
    })
}

function findUrlFunctions(node: any, onUrl: (url: string) => string) {
    switch (node.type) {
        case 'nested-item':
        case 'value':
            node.nodes.forEach((nested: any) => findUrlFunctions(nested, onUrl));
            break;
        case 'url':
            node.url = onUrl(node.url);
            break;
    }
    return node;
}

function findUrlInDecl(decl: any, onUrl: (url: string) => string) {
    var valuesNode = Tokenizer.parseValues(decl.value);
    valuesNode.nodes.forEach((node: any) => findUrlFunctions(node, onUrl));
    decl.value = Tokenizer.stringifyValues(valuesNode);
}

function findUrls(css: any, onUrl: (url: string) => string) {
    css.walkDecls((decl: any) => findUrlInDecl(decl, onUrl))
}