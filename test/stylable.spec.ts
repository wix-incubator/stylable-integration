import fs = require('fs');
import path = require('path');
import { expect } from 'chai';
import webpack = require('webpack');
import MemoryFileSystem = require('memory-fs');
import * as postcss from 'postcss';
const EnvPlugin = require('webpack/lib/web/WebEnvironmentPlugin');
const _eval = require('node-eval');
import {Plugin} from '../src/webpack-loader'
import {fsLike,FSResolver} from '../src/fs-resolver';
import { dirname } from 'path';
import { Resolver } from 'stylable'; //peer
import {dotLess,expectRule,expectRuleOrder,findDecl,findRule,getContentPath,getDistPath,getMemFs,getRuleValue,hasNoCls,isDecl,isRule,jsThatImports,nsChunk,nsSeparator,registerMemFs,selectorClsChunk,TestFunction,testJsEntries,testJsEntry,TestMultiEntries,testRule,testComplexRule,UserConfig,getAssetPath} from '../test-kit/index';
import {StylableIntegrationDefaults,StylableIntegrationOptions} from '../src/options';
const userConfig:UserConfig = {
    rootPath:process.cwd(),
    distRelativePath:'dist',
    assetsRelativePath:'assets',
    contentRelativePath:'sources',
    assetsServerUri:'serve-assets'
}

const folderPath:string = process.cwd();
describe('plugin', function(){
    it('should create modules and target css for css files imported from js',function(done){
        const files = {
            'main.js':jsThatImports(['./main.css']),
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
        },userConfig);
    });
    it('should work with multiple webpack entries',function(done){
        const files = {
            'home.js':jsThatImports(['./home.css']),
            'home.css':`
                .gaga{
                    background:green;
                }

            `,
            'about.js':jsThatImports(['./about.css']),
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
        },userConfig);
    });

    it('should add script for appending to html',function(done){
        const files = {
            'home.js':jsThatImports(['./home.css']),
            'home.css':`
                .gaga{
                    background:green;
                }

            `,
            'about.js':jsThatImports(['./about.css']),
            'about.css':`
                .baga{
                    background:red;
                }

            `
        }
        const entries = ['home','about'];
        testJsEntries(entries,files,(bundles,csss,memfs)=>{
            const homeBundleStr:string = memfs.readFileSync(path.join(getDistPath(userConfig),'home.js')).toString();
            expect(homeBundleStr).to.include('document.createElement');
            done();
        },userConfig,{injectBundleCss:true});
    });


     it('should include css in modules in injectFileCss mode',function(done){
        const files = {
            'home.js':jsThatImports(['./home.css']),
            'home.css':`
                .gaga{
                    background:green;
                }

            `,
            'about.js':jsThatImports(['./about.css']),
            'about.css':`
                .baga{
                    background:red;
                }

            `
        }
        const entries = ['home','about'];
        testJsEntries(entries,files,(bundles,csss,memfs)=>{
            const homeBundle = bundles[0].home.default;
            const homeBundleTargetAst = postcss.parse(homeBundle.targetCss);
            testRule(homeBundle,homeBundleTargetAst,'.gaga','background','green');


            const aboutBundle = bundles[1].about.default;
            const aboutBundleTargetAst = postcss.parse(aboutBundle.targetCss);
            testRule(aboutBundle,aboutBundleTargetAst,'.baga','background','red');
            done();
        },userConfig,{injectFileCss:true});
    });


    it('should work with multiple webpack entries importing same css',function(done){
        const files = {
            'home.js':jsThatImports(['./general.css']),
            'general.css':`
                .gaga{
                    background:green;
                }

            `,
            'about.js':jsThatImports(['./general.css'])
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
        },userConfig);
    });
    it('should not keep output css across multiple runs',function(done){
        const files = {
            'main.js':jsThatImports(['./main.css']),
            'main.css':`
                .gaga{
                    color:red;
                }
            `,
        }
        const files2 = {
            'main.js':jsThatImports(['./zagzag.css']),
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
            },userConfig);
        },userConfig);
    });
    it('should work for many files',function(done){
        const files = {
            'main.js':jsThatImports(['./child.js','./main.css']),
            'child.js':jsThatImports(['./child.css']),
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
        },userConfig);
    });
    it('should generate css for imported files',function(done){
        const files = {
            'main.js':jsThatImports(['./child.js','./main.css']),
            'child.js':jsThatImports(['./child.css']),
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
                testComplexRule(cssAst,[{m:cssModule,cls:'.gaga'},{m:childCssModule,cls:'.root'}],'color','red'),
                testComplexRule(cssAst,[{m:cssModule,cls:'.gaga'},{m:childCssModule,cls:'.baga'}],'color','blue')
            ]);


            done();
        },userConfig);
    });
    it('should resolve variables',function(done){
        const files = {
            'main.js':jsThatImports(['./child.js','./main.css']),
            'child.js':jsThatImports(['./child.css']),
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
        },userConfig);
    });
    it('should move imported assets to dist/assets svg',function(done){
        const files = {
            'main.js':jsThatImports(['./main.css']),
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
            expect(memfs.readFileSync(getAssetPath(userConfig)+'\\sources\\asset.svg','utf8')).to.eql(files['asset.svg'])

            done();
        },userConfig);
    });
    it('should move imported assets to dist/assets jpg',function(done){
        const banana = fs.readFileSync('./test/fixtures/banana.jpg');
        const files = {
            'main.js':jsThatImports(['./main.css']),
            'main.css':`
                .daga{
                    background:url("./banana.jpg");
                }
            `,
            'banana.jpg':banana
        }
        testJsEntry('main.js',files,(bundle,css,memfs)=>{
            expect(css).to.not.include( './banana.jpg');
            expect(css.split(`url("${userConfig.assetsServerUri}/sources/banana.jpg")`).length,'converted url count').to.equal(2);
            expect(memfs.readFileSync(getAssetPath(userConfig)+'\\sources\\banana.jpg')).to.eql(files['banana.jpg'])

            done();
        },userConfig);
    });
    xit('should not generate css for files imported only through css',function(done){
        const files = {
            'main.js':jsThatImports(['./main.css']),
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
        },userConfig);
    });
});
