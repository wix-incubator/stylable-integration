import fs = require('fs');
import path = require('path');
import { expect } from 'chai';
import webpack = require('webpack');
import MemoryFileSystem = require('memory-fs');
import * as postcss from 'postcss';
const EnvPlugin = require('webpack/lib/web/WebEnvironmentPlugin');
const _eval = require('node-eval');
const murmurhash = require('murmurhash');
import {Plugin} from '../src/webpack-loader'
type TestFunction = (evaluated: any, css: string, memfs: MemoryFileSystem) => void
type TestMultiEntries = (evaluated: any[], csss: string[], memfs: MemoryFileSystem) => void
import {fsLike,FSResolver} from '../src/fs-resolver';
import { dirname } from 'path';
import { Resolver } from 'stylable'; //peer
import {StylableIntegrationDefaults,StylableIntegrationOptions} from '../src/options';
const nsSeparator = '💠';
const userConfig = {
    outDir:'dist',
    assets:'assets',
    assetsServerUri:'serve-assets'
}

const folderPath:string = process.cwd();
const contentPath:string = path.join(folderPath,'sources');
const distPath:string = path.join(folderPath,userConfig.outDir);
const assetsPath:string = path.join(distPath,userConfig.assets);


function getMemFs(files:{[key:string]:string}):MemoryFileSystem{
    const memfs = new MemoryFileSystem();
    memfs.mkdirpSync(contentPath);
    Object.keys(files).forEach((filename)=>{
        memfs.writeFileSync(path.join(contentPath,filename),files[filename]);
    })


    memfs.mkdirpSync(path.join(folderPath,'node_modules/stylable/runtime'));
    memfs.writeFileSync(path.join(folderPath,'node_modules/stylable/runtime/index.js'),`
        module.exports.create = function(rootClass,namespace,namespaceMap,targetCss){
            return {
                rootClass,
                namespace,
                namespaceMap,
                targetCss
            }
        }
    `);
    memfs.writeFileSync(path.join(folderPath,'/package.json'),`
        {
            "name":"hello"
        }
    `);
    return memfs;
}

function registerMemFs(compiler:any,memfs:MemoryFileSystem){
    compiler.inputFileSystem = memfs;
    compiler.resolvers.normal.fileSystem = memfs;
    compiler.resolvers.context.fileSystem = memfs;
    compiler.outputFileSystem = memfs;
}

function testJsEntries(entries:string[],files:{[key:string]:string},test: TestMultiEntries,options:Partial<StylableIntegrationOptions> = StylableIntegrationDefaults){
    const memfs = getMemFs(files);
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
            new Plugin(resolver,{...Object.assign(StylableIntegrationDefaults,options)})
        ],
		module: {
			rules: [
				{
					test: /\.css$/,
					loader: path.join(process.cwd(), 'webpack'),
                    options: Object.assign({resolver,filename: '[name].css'})
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





function testJsEntry(entry: string,files:{[key:string]:string}, test: TestFunction, options:StylableIntegrationOptions = {...StylableIntegrationDefaults,assetsDir:assetsPath,assetsServerUri:userConfig.assetsServerUri}) {
    const memfs = getMemFs(files);
    const resolver = new FSResolver('s',process.cwd(),memfs as any);
	const compiler = webpack({
        entry: path.join(contentPath,entry),
		output: {
			path:distPath,
			filename: 'bundle.js'
		},
		plugins: [
            new Plugin(resolver,{...StylableIntegrationDefaults,...options})
        ],
		module: {
			rules: [
				{
					test: /\.css$/,
					loader: path.join(process.cwd(), 'webpack'),
                    options: Object.assign({resolver}, options)
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

function isRule(n:postcss.NodeBase | undefined):n is postcss.Rule{
    return !!n && (n as any).type === 'rule';
}
function isDecl(n:postcss.NodeBase | undefined):n is postcss.Declaration{
    return !!n && (n as any).type === 'decl';
}
function findRule(css:postcss.Root,selector:string):{idx:number,rule:postcss.Rule} | undefined{
    const nodeIdx =  css.nodes!.findIndex((node)=>isRule(node) && node.selector===selector);
    const node = css.nodes![nodeIdx];
    return isRule(node) ? {idx:nodeIdx,rule:node} : undefined;
}
function findDecl(css:postcss.Rule,ruleName:string):postcss.Declaration | undefined{
    const node =  css.nodes!.find((node)=>isDecl(node) && node.prop===ruleName);
    return isDecl(node) ? node : undefined;
}
function getRuleValue(css:postcss.Root,selector:string,ruleName:string):string{
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

function nsChunk(orig:string,cssModule:any){
    if(orig.charAt(0)==='.'){
        return '.'+cssModule.namespace + nsSeparator + orig.slice(1);
    }
    return cssModule.namespace + nsSeparator + orig;
}

function dotLess(str:string){
    return str.charAt(0) === '.' ? str.slice(1) : str;
}



function expectRuleOrder(css:postcss.Root,selectors:string[]){
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


interface selectorClsChunk{
    m:any,
    cls:string
}
function testRule(cssModule:any,css:postcss.Root,selector:string,ruleName:string,value:string){
    const nsCls = nsChunk(selector,cssModule);
    const dotLessSelector = selector.charAt(0)
    expect(cssModule.rootClass).to.eql('root');
    expect(cssModule.namespaceMap[dotLess(selector)],'did not find cls  '+nsCls+'  on module, available cls: '+Object.keys(cssModule.namespaceMap)).to.eql(dotLess(nsCls));
    expectRule(css,nsCls);
    expect(getRuleValue(css,nsCls,ruleName)).to.eql(value);
    return nsCls;
}

function expectRule(css:postcss.Root,selector:string){
    const res = findRule(css,selector);
    expect(typeof res,'did not find cls .'+selector+' in CSS, available cls:\n '+css.nodes!.map((node:any)=>node.selector).join('\n')).to.eql('object');
    return res!.idx;
}


function textComplexRule(css:postcss.Root,chunks:selectorClsChunk[],ruleName:string,value:string){
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


function jsThatImports(fileList:string[]){
    return `module.exports = {${fileList.map((fileName:string)=>{
            const noExt = fileName.split('.').slice(0,-1).join('');
            return ` ${noExt} : require("./${fileName}"),
            `
        }).join('')}}`;
}

function hasNoCls(css:string,cls:string){
    const foundIdx = css.indexOf(nsSeparator+cls);
    let endIdx = css.indexOf('}',foundIdx);
    let startIdx = css.lastIndexOf('}',foundIdx);
    endIdx = endIdx ===-1 && foundIdx !==-1 ? foundIdx+100 : endIdx+1;
    startIdx = startIdx === -1 ? 0 : startIdx;
    expect(foundIdx,`expected to not find class:\n ${cls}\nbut found: \n ${css.substr(startIdx,endIdx)}\n`).to.equal(-1);
}

describe('plugin', function(){
    it('should create modules and target css for css files imported from js',function(done){
        const files = {
            'main.js':jsThatImports(['main.css']),
            'main.css':`
                .gaga{
                    color:red;
                }
            `,
        }
        testJsEntry('main.js',files,(bundle,css)=>{
            const cssAst =  postcss.parse(css);
            const cssModule = bundle.main.default;
            testRule(cssModule,cssAst,'.gaga','color','red');
            done();
        });
    });
    it('should work with multiple webpack entries',function(done){
        const files = {
            'home.js':jsThatImports(['home.css']),
            'home.css':`
                .gaga{
                    background:green;
                }

            `,
            'about.js':jsThatImports(['about.css']),
            'about.css':`
                .baga{
                    background:red;
                }

            `
        }
        const entries = ['home','about'];
        testJsEntries(entries,files,(bundles,csss,memfs)=>{
            const homeCssAst = postcss.parse(csss[0]);
            const homeCssModule = bundles[0].home.default;
            const aboutCssAst = postcss.parse(csss[1]);
            const aboutCssModule = bundles[1].about.default;
            hasNoCls(csss[1],
                testRule(homeCssModule,homeCssAst,'.gaga','background','green')
            );
            hasNoCls(csss[0],
                testRule(aboutCssModule,aboutCssAst,'.baga','background','red'))
            done();
        });
    });

    it('should add script for appending to html',function(done){
        const files = {
            'home.js':jsThatImports(['home.css']),
            'home.css':`
                .gaga{
                    background:green;
                }

            `,
            'about.js':jsThatImports(['about.css']),
            'about.css':`
                .baga{
                    background:red;
                }

            `
        }
        const entries = ['home','about'];
        testJsEntries(entries,files,(bundles,csss,memfs)=>{
            const homeBundleStr:string = memfs.readFileSync(path.join(distPath,'home.js')).toString();
            expect(homeBundleStr).to.include('document.createElement');
            done();
        },{injectBundleCss:true});
    });

    it('should work with multiple webpack entries importing same css',function(done){
        const files = {
            'home.js':jsThatImports(['general.css']),
            'general.css':`
                .gaga{
                    background:green;
                }

            `,
            'about.js':jsThatImports(['general.css'])
        }
        const entries = ['home','about'];
        testJsEntries(entries,files,(bundles,csss,memfs)=>{
            const homeCssAst = postcss.parse(csss[0]);
            const homeCssModule = bundles[0].general.default;
            const aboutCssAst = postcss.parse(csss[1]);
            const aboutCssModule = bundles[1].general.default;
            testRule(homeCssModule,homeCssAst,'.gaga','background','green');
            testRule(aboutCssModule,aboutCssAst,'.gaga','background','green');
            done();
        });
    });
    it('should not keep output css across multiple runs',function(done){
        const files = {
            'main.js':jsThatImports(['main.css']),
            'main.css':`
                .gaga{
                    color:red;
                }
            `,
        }
        const files2 = {
            'main.js':jsThatImports(['zagzag.css']),
            'zagzag.css':`
                .baga{
                    color:red;
                }
            `,
        }
        testJsEntry('main.js',files,(bundle,css)=>{
            const cssAst =  postcss.parse(css);
            const oldCssModule = bundle.main.default;
            testRule(oldCssModule,cssAst,'.gaga','color','red');
            testJsEntry('main.js',files2,(bundle,css)=>{
                hasNoCls(css,'gaga');
                done();
            });
        });
    });
    it('should work for many files',function(done){
        const files = {
            'main.js':jsThatImports(['child.js','main.css']),
            'child.js':jsThatImports(['child.css']),
            'main.css':`
                .gaga{
                    color:red;
                }
            `,
            'child.css':`
                .baga{
                    background:green;
                }
            `
        }
        testJsEntry('main.js',files,(bundle,css)=>{
            const cssAst =  postcss.parse(css);
            const cssModule = bundle.main.default;
            const childCssModule = bundle.child.child.default;


            expectRuleOrder(cssAst,[
                testRule(childCssModule,cssAst,'.baga','background','green'),
                testRule(cssModule,cssAst,'.gaga','color','red')
            ]);
            done();
        });
    });
    it('should generate css for imported files',function(done){
        const files = {
            'main.js':jsThatImports(['child.js','main.css']),
            'child.js':jsThatImports(['child.css']),
            'main.css':`
                :import{
                    -st-from:'./child.css';
                    -st-default:Child;
                }
                .gaga{
                    -st-extends:Child;
                    color:red;
                }
                .gaga::baga{
                    color:blue;
                }
            `,
            'child.css':`
                .baga{
                    background:green;
                }
            `
        }
        testJsEntry('main.js',files,(bundle,css)=>{
            const cssAst =  postcss.parse(css);
            const cssModule = bundle.main.default;
            const childCssModule = bundle.child.child.default;
            expectRuleOrder(cssAst,[
                testRule(childCssModule,cssAst,'.baga','background','green'),
                textComplexRule(cssAst,[{m:cssModule,cls:'.gaga'},{m:childCssModule,cls:'.root'}],'color','red'),
                textComplexRule(cssAst,[{m:cssModule,cls:'.gaga'},{m:childCssModule,cls:'.baga'}],'color','blue')
            ]);


            done();
        });
    });
    it('should resolve variables',function(done){
        const files = {
            'main.js':jsThatImports(['child.js','main.css']),
            'child.js':jsThatImports(['child.css']),
            'main.css':`
                :import{
                    -st-from:'./child.css';
                    -st-named:zag;
                }
                :vars{
                    zig:white;
                }
                .gaga{
                    color:value(zag);
                    background:value(zig);
                }
            `,
            'child.css':`
                :vars{
                    zag:red;
                }

            `
        }
        testJsEntry('main.js',files,(bundle,css)=>{
            const cssAst =  postcss.parse(css);
            const cssModule = bundle.main.default;
            const childCssModule = bundle.child.child.default;
            testRule(cssModule,cssAst,'.gaga','background','white');
            testRule(cssModule,cssAst,'.gaga','color','red');
            done();
        });
    });
    it('should move imported assets to dist/assets ',function(done){
        const files = {
            'main.js':jsThatImports(['main.css']),
            'main.css':`
                .gaga{
                    background:url( ./asset.svg);
                }
                .baga{
                    background:url(./asset.svg);
                }
                .daga{
                    background:url("./asset.svg");
                }
                .daga{
                    background:url("./asset.svg");
                }
            `,
            'asset.svg':`
                <svg height="100" width="100">
                    <circle cx="50" cy="50" r="40" stroke="black" stroke-width="3" fill="red" />
                </svg>
            `
        }
        testJsEntry('main.js',files,(bundle,css,memfs)=>{
            expect(css).to.not.include( './asset.svg');
            expect(css.split(`url("${userConfig.assetsServerUri}/sources/asset.svg")`).length,'converted url count').to.equal(5);
            expect(memfs.readFileSync(assetsPath+'\\sources\\asset.svg','utf8')).to.eql(files['asset.svg'])

            done();
        });
    });

    xit('should not generate css for files imported only through css',function(done){
        const files = {
            'main.js':jsThatImports(['main.css']),
            'main.css':`
                :import{
                    -st-from:'./child.css';
                    -st-default:Child;
                }
                .gaga{
                    -st-extends:Child;
                    color:red;
                }
                .gaga::baga{
                    color:blue;
                }
            `,
            'child.css':`
                .baga{
                    background:green;
                }
            `
        }
        testJsEntry('main.js',files,(bundle,css)=>{
            const cssAst =  postcss.parse(css);
            const cssModule = bundle.main.default;
            hasNoCls(css,'baga');
            hasNoCls(css,'gaga');

            done();
        });
    });
});
