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
type TestFunction = (evaluated: any, bundle: string, stats?: any) => void
type TestFunction2 = (evaluated: any, bundle: postcss.Root, stats?: any) => void


import { dirname } from 'path';
import { Resolver } from 'stylable'; //peer
import { createStylesheetWithNamespace, resolveImports } from '../src/stylable-transform';

export class MFsResolver extends Resolver {
    constructor(private prefix: string, private mFs:MemoryFileSystem) {
        super({});
    }
    resolveModule(path: string) {
        path = path.replace("c:\\",'/')
        var resolved;
        if (path.match(/\.css$/)) {
            resolved = createStylesheetWithNamespace(
                resolveImports(this.mFs.readFileSync(path, 'utf8'), dirname(path)).resolved,
                path,
                this.prefix
            );
        } else {
            resolved = require(path);
        }

        return resolved;
    }
}


function testJsEntry(entry: string,files:{[key:string]:string}, test: TestFunction2, options = {}) {
    const memfs = new MemoryFileSystem();
    Object.keys(files).forEach((filename)=>{
        memfs.writeFileSync('/'+filename,files[filename]);
    })


    memfs.mkdirpSync('/node_modules/stylable/runtime');
    memfs.writeFileSync('/node_modules/stylable/runtime/index.js',`
        module.exports.create = function(rootClass,namespace,namespaceMap,targetCss){
            return {
                rootClass,
                namespace,
                namespaceMap,
                targetCss
            }
        }
    `);
    // memfs.mkdirpSync(process.cwd());
    memfs.writeFileSync('/package.json',`
        {}
    `);
    const resolver = new MFsResolver('s',memfs);
	const compiler = webpack({
        entry: '/'+entry,
		output: {
			path:'/dist',
			filename: 'bundle.js'
		},
		plugins: [
            new Plugin(resolver)
        ],
		module: {
			rules: [
				{
					test: /\.css$/,
					loader: path.join(process.cwd(), '/webpack'),
					options: Object.assign({resolver}, options)
				}
			]
		}
    });



    (compiler as any).inputFileSystem = memfs;
    (compiler as any).resolvers.normal.fileSystem = memfs;
    (compiler as any).resolvers.context.fileSystem = memfs;
    (compiler as any).outputFileSystem = memfs;


    compiler.run( function (err: Error, stats: any) {
        if (err) { throw err; }
		const bundle = memfs.readFileSync('/dist/bundle.js', 'utf8');
        const bundleCss = memfs.readFileSync('/dist/bundle.css', 'utf8');

		test(_eval(bundle), postcss.parse(bundleCss), stats);
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
    return cssModule.namespace+'💠'+orig;
}

function testRule(cssModule:any,css:postcss.Root,selector:string,ruleName:string,value:string){
    const nsCls = nsChunk(selector,cssModule)
    expect(cssModule.rootClass).to.eql('root');
    expect(cssModule.namespaceMap[selector],'did not find cls  '+nsCls+'  on module, available cls: '+Object.keys(cssModule.namespaceMap)).to.eql(nsCls);
    expectRule(css,'.'+nsCls);
    expect(getRuleValue(css,'.'+nsCls,ruleName)).to.eql(value);

}

function expectRule(css:postcss.Root,selector:string){
    const res = findRule(css,selector);
    expect(typeof res,'did not find cls .'+selector+' in CSS, available cls:\n '+css.nodes!.map((node:any)=>node.selector).join('\n')).to.eql('object');
    return res!.idx;
}

function expectRuleOrder(css:postcss.Root,selectors:string[]){
    const res = selectors.map((selector)=>{
        const idx = expectRule(css,selector);
        expect(typeof res,'did not find cls .'+selector+' in CSS, available cls:\n '+css.nodes!.map((node:any)=>node.selector).join('\n')).to.eql('object');
    })
}


//textComplexRule(css,[{m:cssModule,cls:'gaga'},{m:childCssModule,cls:'baga'}],'color','red');
interface selectorClsChunk{
    m:any,
    cls:string
}

function textComplexRule(css:postcss.Root,chunks:selectorClsChunk[],ruleName:string,value:string){
    let resNscls = '.'+chunks.map((chunk:selectorClsChunk,idx:number)=>{
        const cssModule = chunk.m;
        const nsCls = nsChunk(chunk.cls,chunk.m);
        expect(cssModule.namespaceMap[chunk.cls]).to.eql(nsCls);
        if(idx!==0 && chunk.cls!=='root'){
            const rootCls = nsChunk('root',chunk.m);
            return rootCls+' .'+nsCls;
        }
        return nsCls;
    }).join('.')
    expectRule(css,resNscls);
    expect(getRuleValue(css,resNscls,ruleName)).to.eql(value);

}

function testNoRule(cssModule:any,css:postcss.Root,selector:string,ruleName:string){
    const nsCls = cssModule.namespace+'💠'+selector;
    expect(cssModule.rootClass).to.eql('root');
    expect(cssModule.namespaceMap[selector]).to.eql(nsCls);
    expect(getRuleValue(css,'.'+nsCls,ruleName)).to.eql('');
}


function jsThatImports(fileList:string[]){
    return `module.exports = {${fileList.map((fileName:string)=>{
            const noExt = fileName.split('.').slice(0,-1).join('');
            return ` ${noExt} : require("./${fileName}"),
            `
        }).join('')}}`;
}

describe.only('plugin', function(){
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
            const cssModule = bundle.main.default;
            testRule(cssModule,css,'gaga','color','red');
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
            const oldCssModule = bundle.main.default;
            testRule(oldCssModule,css,'gaga','color','red');
            testJsEntry('main.js',files2,(bundle,css)=>{
                // const newCssModule = bundle.main.default;
                testNoRule(oldCssModule,css,'gaga','color');
                // testNoRule(newCssModule,css,'gaga','color');
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
            const cssModule = bundle.main.default;
            const childCssModule = bundle.child.child.default;
            testRule(cssModule,css,'gaga','color','red');
            testRule(childCssModule,css,'baga','background','green');
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
            const cssModule = bundle.main.default;
            const childCssModule = bundle.child.child.default;
            testRule(childCssModule,css,'baga','background','green');
            textComplexRule(css,[{m:cssModule,cls:'gaga'},{m:childCssModule,cls:'root'}],'color','red');
            textComplexRule(css,[{m:cssModule,cls:'gaga'},{m:childCssModule,cls:'baga'}],'color','blue');
            done();
        });
    });
});
