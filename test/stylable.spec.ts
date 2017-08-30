import fs = require('fs');
import path = require('path');
import { expect } from 'chai';
import * as postcss from 'postcss';
const _eval = require('node-eval');
import { expectRuleOrder, getDistPath, hasNoCls, jsThatImports, testJsEntries, testJsEntry, testRule, testComplexRule, TestConfig, getAssetRegExp, getRuleValue } from '../test-kit/index';
const testConfig:TestConfig = {
    rootPath:process.cwd(),
    distRelativePath:'dist',
    fileNameFormat:'[name].js',
    assetsRelativePath:'assets',
    contentRelativePath:'sources',
    assetsServerUri:'serve-assets'
}

const assetRegEx = getAssetRegExp(testConfig);

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
        },testConfig);
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
        testJsEntries(entries,files,(bundles,csss)=>{
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
        },testConfig);
    });

    it('should support fileName webpack format',function(done){
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
        testJsEntries(entries,files,(bundles,csss)=>{
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
        },{...testConfig,fileNameFormat:'[name].bundle.js'});
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
        testJsEntries(entries,files,(_bundles,_csss,memfs)=>{
            const homeBundleStr:string = memfs.readFileSync(path.join(getDistPath(testConfig),'home.bundle.js')).toString();
            const aboutBundleStr:string = memfs.readFileSync(path.join(getDistPath(testConfig),'about.bundle.js')).toString();
            expect(homeBundleStr).to.include('document.createElement');
            expect(homeBundleStr).to.include('assets/home.bundle.css');
            expect(aboutBundleStr).to.include('assets/about.bundle.css');
            done();
        },{...testConfig,fileNameFormat:'[name].bundle.js'},{injectBundleCss:true});
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
        testJsEntries(entries,files,(bundles)=>{
            const homeBundle = bundles[0].home.default;
            const homeBundleTargetAst = postcss.parse(homeBundle.targetCss);
            testRule(homeBundle,homeBundleTargetAst,'.gaga','background','green');


            const aboutBundle = bundles[1].about.default;
            const aboutBundleTargetAst = postcss.parse(aboutBundle.targetCss);
            testRule(aboutBundle,aboutBundleTargetAst,'.baga','background','red');
            done();
        },testConfig,{injectFileCss:true});
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
        testJsEntries(entries,files,(bundles,csss)=>{
            const homeCssAst = postcss.parse(csss[0]);
            const homeCssModule = bundles[0].general.default;
            const aboutCssAst = postcss.parse(csss[1]);
            const aboutCssModule = bundles[1].general.default;
            testRule(homeCssModule,homeCssAst,'.gaga','background','green');
            testRule(aboutCssModule,aboutCssAst,'.gaga','background','green');
            done();
        },testConfig);
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
            testJsEntry('main.js',files2,(_bundle,css)=>{
                hasNoCls(css,'gaga');
                done();
            },testConfig);
        },testConfig);
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
        },testConfig);
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
        },testConfig);
    });
    it('should put common CSS at the top according to JS dependency tree(weaker)',function(done){
        const files = {
            'entry.js':jsThatImports(['./common.css', './child.js', './entry.css']),
            'child.js':jsThatImports(['./child.css', './common.css']),
            'entry.css':`
                .a { color:red; }
            `,
            'common.css':`
                .c { color:blue; }
            `,
            'child.css':`
                .b { color:green; }
            `
        }
        testJsEntry('entry.js',files,(_bundle,css)=>{
            const cssAst =  postcss.parse(css);
            const cRule = <postcss.Rule>cssAst.nodes![0];
            const bRule = <postcss.Rule>cssAst.nodes![1];
            const aRule = <postcss.Rule>cssAst.nodes![2];

            expect(cRule.nodes![0].toString(), 'common').to.equal(`color:blue`);
            expect(bRule.nodes![0].toString(), 'child').to.equal(`color:green`);
            expect(aRule.nodes![0].toString(), 'entry').to.equal(`color:red`);

            done();
        },testConfig);
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

            testRule(cssModule,cssAst,'.gaga','background','white');
            testRule(cssModule,cssAst,'.gaga','color','red');
            done();
        },testConfig);
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
        testJsEntry('main.js',files,(_bundle,css,memfs)=>{
            expect(css).to.not.include( './asset.svg');
            const match = css.split(assetRegEx);

            expect(match!.length,'converted url count').to.equal(9);
            expect(memfs.readFileSync(path.join(getDistPath(testConfig), match![1]), 'utf8')).to.eql(files['asset.svg']);

            done();
        },testConfig);
    });
    it('should not replace missing asset',function(done){
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
            `
        }
        testJsEntry('main.js',files,(_bundle,css)=>{
            expect(css.split('./asset.svg').length).to.equal(5);
            // expect(memfs.readFileSync(getAssetPath(userConfig)+'\\sources\\asset.svg','utf8')).to.eql(files['asset.svg'])

            done();
        },testConfig);
    });
    it('should not replace missing base 64 images',function(done){
        const img:string = `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjIiIHZpZXdCb3g9IjAgMCA4IDIiPiAgICA8cGF0aCBmaWxsPSIjRkZGIiBmaWxsLXJ1bGU9Im5vbnplcm8iIGQ9Ik0xIDJoNmExIDEgMCAwIDAgMC0ySDFhMSAxIDAgMCAwIDAgMnoiLz48L3N2Zz4=`
        const files = {
            'main.js':jsThatImports(['./main.css']),
            'main.css':`
                .gaga{
                    background-image: url(${img});
                }

            `
        }
        testJsEntry('main.js',files,(_bundle,css)=>{
            expect(css).to.include(img);
            done();
        },testConfig);
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
        testJsEntry('main.js',files,(_bundle,css,memfs)=>{
            expect(css).to.not.include( './banana.jpg');
            const match = css.match(assetRegEx);
            expect(match!.length,'converted url count').to.equal(2);
            expect(memfs.readFileSync(path.join(getDistPath(testConfig), match![1]))).to.eql(files['banana.jpg'])

            done();
        },testConfig);
    });
    it('should not generate css for files imported only through css',function(done){
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
        testJsEntry('main.js',files,(_bundle,css)=>{
            hasNoCls(css,'baga');
            hasNoCls(css,'gaga');

            done();
        },testConfig);
    });
    it('should generate css for theme imports (imported only through css)',function(done){
        const files = {
            'main.js':jsThatImports(['./main.css']),
            'main.css':`
                :import{
                    -st-theme: true;
                    -st-from:'./theme.css';
                }
                .gaga{
                    color:red;
                }
            `,
            'theme.css':`
                .baga{
                    background:green;
                }
            `
        }
        testJsEntry('main.js',files,(bundle,css)=>{
            const cssAst =  postcss.parse(css);
            const cssModule = bundle.main.default;
            const themeRuleset = <postcss.Rule>cssAst.nodes![0]!;
            testRule(cssModule, cssAst,'.gaga','color','red');
            expect(themeRuleset.selector, 'theme selector').to.match(/\.theme.+root\s.theme.+baga/);
            expect(getRuleValue(cssAst, themeRuleset.selector, 'background')).to.eql('green');
            done();
        },testConfig);
    });
    it('should generate css for theme overrides',function(done){
        const files = {
            'main.js':jsThatImports(['./main.css']),
            'main.css':`
                :import{
                    -st-theme: true;
                    -st-from:'./theme.css';
                    color1: black;
                }
            `,
            'theme.css':`
                :vars {
                    color1: purple;
                }
                .baga{
                    background:value(color1);
                }
            `
        }
        testJsEntry('main.js',files,(_bundle, css)=>{
            const cssAst =  postcss.parse(css);
            const themeRulesetOriginal = <postcss.Rule>cssAst.nodes![0]!;
            const themeRulesetOverride = <postcss.Rule>cssAst.nodes![1]!;
            expect(themeRulesetOriginal.selector, 'theme selector original').to.match(/\.theme.+root\s.theme.+baga/);
            expect(themeRulesetOverride.selector, 'theme selector override').to.match(/\.main.+root\s.theme.+baga/);
            expect(themeRulesetOriginal.nodes![0].toString(), 'original declarations').to.equal('background:purple');
            expect(themeRulesetOverride.nodes![0].toString(), 'override declarations').to.equal('background:black');

            // expectRuleOrder(cssAst,[ // ToDo: find out what this should do...
                // expect(getRuleValue(cssAst, themeRuleset.selector, 'background')).to.eql('purple');
                // expect(getRuleValue(cssAst, themeRuleset.selector, 'background')).to.eql('black');
            // ]);
            done();
        },testConfig);
    });
    it('should generate css from JS mixin',function(done){
        const files = {
            'main.js':jsThatImports(['./main.css']),
            'main.css':`
                :import{
                    -st-from:'./jsmixin.js';
                    -st-named: mixStuff;
                }
                .gaga{
                    color:red;
                    -st-mixin: mixStuff;
                }
            `,
            'jsmixin.js':`
                module.exports = {
                    mixStuff:function(){
                        return {
                            "background":"green",
                            ".child":{
                                "color": "yellow"
                            }
                        }
                    }
                };
            `
        }
        
        testJsEntry('main.js',files,(bundle,css)=>{
        
            const cssAst =  postcss.parse(css);
            const cssModule = bundle.main.default;
            const locals = cssModule.namespaceMap;

            testRule(cssModule, cssAst, '.gaga', 'color', 'red');
            testRule(cssModule, cssAst, '.gaga', 'background', 'green');
            

            const rule = <postcss.Rule>cssAst.nodes![1];

            expect(rule.selector).to.equal(`.${locals.root} .${locals.gaga} .${locals.child}`)
            expect(rule.nodes![0].toString()).to.equal(`color:yellow`);
            
            done();
        }, testConfig, {
            requireModule: function(_path: string) {
                return _eval(files['jsmixin.js'])
            }
        });
    });

});
