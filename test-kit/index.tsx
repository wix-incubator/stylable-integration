
import fs = require('fs');
import path = require('path');
import { expect } from 'chai';
import webpack = require('webpack');
import MemoryFileSystem = require('memory-fs');
import * as postcss from 'postcss';
const EnvPlugin = require('webpack/lib/web/WebEnvironmentPlugin');
const _eval = require('node-eval');
import {Plugin} from '../src/webpack-loader'
export type TestFunction = (evaluated: any, css: string, memfs: MemoryFileSystem) => void
export type TestMultiEntries = (evaluated: any[], csss: string[], memfs: MemoryFileSystem) => void
import {FSResolver} from '../src/fs-resolver';
import {fsLike} from '../src/types';
import { dirname } from 'path';
import { Resolver } from 'stylable'; //peer
import {StylableIntegrationDefaults,StylableIntegrationOptions} from '../src/options';

export const nsSeparator = '💠';


const runtimeFuncMock = `function(rootClass,namespace,namespaceMap,targetCss){
            return {
                rootClass,
                namespace,
                namespaceMap,
                targetCss
            }
        }`


export function evalCommonJsCssModule(module:string){
    const modified = module.replace('require("stylable/runtime").create',`(${runtimeFuncMock})`);
    return _eval(modified);

}

export function getMemFs(files:{[key:string]:string | Buffer},folderPath:string,contentRelativePath:string):MemoryFileSystem{
    const contentPath = path.join(folderPath,contentRelativePath);
    const memfs = new MemoryFileSystem();
    memfs.mkdirpSync(contentPath);
    Object.keys(files).forEach((filename)=>{
        const filePath = path.join(contentPath,filename);
        const fileDir = path.dirname(filePath);
        memfs.mkdirpSync(fileDir);
        memfs.writeFileSync(filePath,files[filename]);
    })


    memfs.mkdirpSync(path.join(folderPath,'node_modules/stylable/runtime'));
    memfs.writeFileSync(path.join(folderPath,'node_modules/stylable/runtime/index.js'),`
        module.exports.create = ${runtimeFuncMock}
    `);
    memfs.writeFileSync(path.join(folderPath,'/package.json'),`
        {
            "name":"hello"
        }
    `);
    return memfs;
}

export function registerMemFs(compiler:any,memfs:MemoryFileSystem){
    compiler.inputFileSystem = memfs;
    compiler.resolvers.normal.fileSystem = memfs;
    compiler.resolvers.context.fileSystem = memfs;
    compiler.outputFileSystem = memfs;
}


export interface TestConfig{
    rootPath:string;
    contentRelativePath:string;
    distRelativePath:string;
    assetsServerUri:string;
    assetsRelativePath:string;
}

export const getAssetRegExp = (config:TestConfig)=>new RegExp( `url\\s*\\(\\s*["']?${config.assetsServerUri}\\/(.*?)["']?\\s*\\)`);


export function getDistPath(config:TestConfig){
    return path.join(config.rootPath,config.distRelativePath);
}

export function getAssetPath(config:TestConfig){
    return path.join(config.rootPath,config.assetsRelativePath);
}
export function getContentPath(config:TestConfig){
    return path.join(config.rootPath,config.contentRelativePath);
}

export function testJsEntries(entries:string[],files:{[key:string]:string},test: TestMultiEntries,config:TestConfig,options:Partial<StylableIntegrationOptions> = StylableIntegrationDefaults){
    const contentPath = getContentPath(config)
    const distPath = getDistPath(config);
    const memfs = getMemFs(files,config.rootPath,config.contentRelativePath);
    const resolver = new FSResolver('s',memfs as any);
    let entriesRes : {[key:string]:string} = {};
	const compiler = webpack({
        entry: entries.reduce((accum,entry)=>{
            accum[entry] = path.join(contentPath,entry+'.js')
            return accum;
        },entriesRes),
		output: {
			path:distPath,
			filename: '[name].js'
		},
		plugins: [
            new Plugin({...StylableIntegrationDefaults,...options},resolver)
        ],
		module: {
			rules: [
				{
					test: /\.css$/,
					loader: path.join(process.cwd(), 'webpack-loader'),
                    options: {resolver,filename: '[name].css',...options}
				}
			]
		}
    });

    registerMemFs(compiler,memfs);

    compiler.run( function (err: Error, stats: any) {
        if (err) { throw err; }
		const evaledBundles = entries.map((entry)=>_eval(memfs.readFileSync(path.join(distPath,entry+'.js'), 'utf8')));
		const bundlesCss = entries.map((entry)=>memfs.readFileSync(path.join(distPath,entry+'.css'), 'utf8'));

        test(evaledBundles,bundlesCss, memfs);

    })
}





export function testJsEntry(entry: string,files:{[key:string]:string | Buffer} | MemoryFileSystem, test: TestFunction,config:TestConfig, options:StylableIntegrationOptions = {...StylableIntegrationDefaults,assetsDir:path.resolve(config.rootPath,config.assetsRelativePath),assetsServerUri:config.assetsServerUri}) {

    const memfs = files instanceof MemoryFileSystem ? files : getMemFs(files,config.rootPath,config.contentRelativePath);
    const contentPath = getContentPath(config);
    const distPath = getDistPath(config);
    const resolver = new FSResolver('s',process.cwd(),memfs as any);
	const compiler = webpack({
        entry: path.join(contentPath,entry),
		output: {
            publicPath:config.assetsServerUri+'/',
			path:distPath,
			filename: 'bundle.js'
		},
		plugins: [
            new Plugin({...StylableIntegrationDefaults,...options},resolver)
        ]
        ,
		module: {
			rules: [
				{
					test: /\.css$/,
					loader: path.join(process.cwd(), 'webpack-loader'),
                    options: Object.assign({resolver}, options)
				},
                {
                    test: /\.(png|jpg|gif|svg)$/,
                    use: [
                    {
                        loader: 'url-loader',
                        options: {
                            limit: 1
                        }
                    }
                    ]
                }
			]
		}
    });

    registerMemFs(compiler,memfs);

    compiler.run( function (err: Error, stats: any) {
        if (err) { throw err; }
		const bundle = memfs.readFileSync(path.join(distPath,'bundle.js'), 'utf8');
        const bundleCss = memfs.readFileSync(path.join(distPath,'bundle.css'), 'utf8');
        test(_eval(bundle),bundleCss, memfs);
    })
}

export function isRule(n:postcss.NodeBase | undefined):n is postcss.Rule{
    return !!n && (n as any).type === 'rule';
}
export function isDecl(n:postcss.NodeBase | undefined):n is postcss.Declaration{
    return !!n && (n as any).type === 'decl';
}
export function findRule(css:postcss.Root,selector:string):{idx:number,rule:postcss.Rule} | undefined{
    const nodeIdx =  css.nodes!.findIndex((node)=>isRule(node) && node.selector===selector);
    const node = css.nodes![nodeIdx];
    return isRule(node) ? {idx:nodeIdx,rule:node} : undefined;
}
export function findDecl(css:postcss.Rule,ruleName:string):postcss.Declaration | undefined{
    const node =  css.nodes!.find((node)=>isDecl(node) && node.prop===ruleName);
    return isDecl(node) ? node : undefined;
}
export function getRuleValue(css:postcss.Root,selector:string,ruleName:string):string{
    const res = findRule(css,selector);
    if(!res){
        return '';
    }
    const decl = findDecl(res.rule,ruleName);
    if(!decl){
        return '';
    }
    return decl.value;
}

export function nsChunk(orig:string,cssModule:any){
    if(orig.charAt(0)==='.'){
        return '.'+cssModule.namespace + nsSeparator + orig.slice(1);
    }
    return cssModule.namespace + nsSeparator + orig;
}

export function dotLess(str:string){
    return str.charAt(0) === '.' ? str.slice(1) : str;
}



export function expectRuleOrder(css:postcss.Root,selectors:string[]){
    const res = selectors.map((selector)=>{
        return {
                    idx:expectRule(css,selector),
                    selector
        }
    });
    const sortedRes = res.slice().sort((resItem,resItem2)=>{
        return resItem.idx>resItem2.idx ? 1 : -1;
    });
    let expected = res.map((item)=>item.selector);
    let sorted = sortedRes.map((item)=>item.selector);
    expect(expected,'selector order \nexpected :'+expected + "\n but got :" + sorted).to.eql(sorted);

}


export interface selectorClsChunk{
    m:any,
    cls:string
}

export function testCssModule(cssModule:any,selector:string){
    const nsCls = nsChunk(selector,cssModule);
    const dotLessSelector = selector.charAt(0)
    expect(cssModule.rootClass).to.eql('root');
    expect(cssModule.namespaceMap[dotLess(selector)],'did not find cls  '+nsCls+'  on module, available cls: '+Object.keys(cssModule.namespaceMap)).to.eql(dotLess(nsCls));
    return nsCls;
}


export function testRule(cssModule:any,css:postcss.Root,selector:string,ruleName:string,value:string){
    const nsCls = testCssModule(cssModule,selector);
    expectRule(css,nsCls);
    expect(getRuleValue(css,nsCls,ruleName)).to.eql(value);
    return nsCls;
}

export function expectRule(css:postcss.Root,selector:string){
    const res = findRule(css,selector);
    expect(typeof res,'did not find cls .'+selector+' in CSS, available cls:\n '+css.nodes!.map((node:any)=>node.selector).join('\n')).to.eql('object');
    return res!.idx;
}


export function testComplexRule(css:postcss.Root,chunks:selectorClsChunk[],ruleName:string,value:string){
    let resNscls = chunks.map((chunk:selectorClsChunk,idx:number)=>{
        const cssModule = chunk.m;
        const nsCls = nsChunk(chunk.cls,chunk.m);
        expect(cssModule.namespaceMap[dotLess(chunk.cls)]).to.eql(dotLess(nsCls));
        if(idx!==0 && chunk.cls!=='.root'){
            const rootCls = nsChunk('.root',chunk.m);
            return rootCls+' '+nsCls;
        }
        return nsCls;
    }).join('');
    expectRule(css,resNscls);
    expect(getRuleValue(css,resNscls,ruleName)).to.eql(value);
    return resNscls;
}


export function jsThatImports(fileList:string[]){
    return `module.exports = {${fileList.map((fileName:string)=>{
            let noExt = fileName;
            if(noExt.indexOf('./')==0){
                noExt = noExt.slice(2);
            }
            noExt = noExt.split('.').slice(0,-1).join('');

            return ` "${noExt}" : require("${fileName}"),
            `
        }).join('')}}`;
}

export function hasNoCls(css:string,cls:string){
    const foundIdx = css.indexOf(nsSeparator+cls);
    let endIdx = css.indexOf('}',foundIdx);
    let startIdx = css.lastIndexOf('}',foundIdx);
    endIdx = endIdx ===-1 && foundIdx !==-1 ? foundIdx+100 : endIdx+1;
    startIdx = startIdx === -1 ? 0 : startIdx;
    expect(foundIdx,`expected to not find class:\n ${cls}\nbut found: \n ${css.substr(startIdx,endIdx)}\n`).to.equal(-1);
}
