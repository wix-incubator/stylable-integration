import { expect } from 'chai';
import * as postcss from 'postcss';
const _eval = require('node-eval');
import { jsThatImports, webpackTest, matchRules, getAssetSource, evalCssJSModule } from '../test-kit/index';


describe('plugin', function () {
    it('should create modules and target css for css files imported from js', function () {

        const { run } = webpackTest({
            files: {
                '/main.js': jsThatImports(['./main.st.css']),
                '/main.st.css': `
                    .gaga{
                        color:red;
                    }
                `,
            },
            config: {
                entry: './main.js'
            }
        });

        return run().then(({ stats }) => {
            const css = getAssetSource(stats, 'main.css');
            const js = getAssetSource(stats, 'main.js');
            const cssModule = evalCssJSModule(js).main.default;

            matchRules(css, [`.${cssModule.root} .${cssModule.gaga}`]);

        })

    });

    it('should work with multiple webpack entries', function () {


        const { run } = webpackTest({
            files: {
                '/home.js': jsThatImports(['./home.st.css']),
                '/home.st.css': `
                    .gaga{
                        background:green;
                    }
    
                `,
                '/about.js': jsThatImports(['./about.st.css']),
                '/about.st.css': `
                    .baga{
                        background:red;
                    }    
                `
            },
            config: {
                entry: {
                    home: './home.js',
                    about: './about.js'
                }
            },
            stylableConfig: {
                filename: '[name].bundle.css'
            }
        });

        return run().then(({ stats }) => {
            const homeCSS = getAssetSource(stats, 'home.bundle.css');
            const homeJS = getAssetSource(stats, 'home.js');
            const homeModule = evalCssJSModule(homeJS).home.default;

            const aboutCSS = getAssetSource(stats, 'about.bundle.css');
            const aboutJS = getAssetSource(stats, 'about.js');
            const aboutModule = evalCssJSModule(aboutJS).about.default;

            matchRules(homeCSS, [`.${homeModule.root} .${homeModule.gaga}`]);
            matchRules(aboutCSS, [`.${aboutModule.root} .${aboutModule.baga}`]);

        })

    });

    it('should work with multiple webpack entries importing same css', function () {
        const { run } = webpackTest({
            files: {
                '/home.js': jsThatImports(['./general.st.css']),
                '/general.st.css': `
                    .gaga{
                        background:green;
                    }
    
                `,
                '/about.js': jsThatImports(['./general.st.css'])
            },
            config: {
                entry: {
                    home: './home.js',
                    about: './about.js'
                }
            },
            stylableConfig: {
                filename: '[name].bundle.css'
            }
        });

        return run().then(({ stats }) => {
            const homeCSS = getAssetSource(stats, 'home.bundle.css');
            const homeJS = getAssetSource(stats, 'home.js');
            const homeModule = evalCssJSModule(homeJS).general.default;

            const aboutCSS = getAssetSource(stats, 'about.bundle.css');
            const aboutJS = getAssetSource(stats, 'about.js');
            const aboutModule = evalCssJSModule(aboutJS).general.default;

            matchRules(homeCSS, [`.${homeModule.root} .${homeModule.gaga}`]);
            matchRules(aboutCSS, [`.${aboutModule.root} .${aboutModule.gaga}`]);

        })

    });


    it('should add script for appending to html', function () {
        const { run } = webpackTest({
            files: {
                '/home.js': jsThatImports(['./home.st.css']),
                '/home.st.css': `
                    .gaga{
                        background:green;
                    }  
                `
            },
            config: {
                entry: { home: './home.js' }
            },
            stylableConfig: {
                filename: '[name].bundle.css',
                injectBundleCss: true
            }
        });

        return run().then(({ stats }) => {
            const homeJS = getAssetSource(stats, 'home.js');
            expect(homeJS).to.match(/style.id = "home.bundle.css";/)
        });

    });

    it('should order bundle from js imports order', function () {
        const { run } = webpackTest({
            files: {
                '/main.js': jsThatImports(['./main.st.css', './child.js']),
                '/child.js': jsThatImports(['./child.st.css']),
                '/main.st.css': `
                    .gaga{
                        color:red;
                    }
                `,
                '/child.st.css': `
                    .baga{
                        background:green;
                    }
                `
            },
            config: {
                entry: './main.js'
            }
        });

        return run().then(({ stats }) => {

            const mainCSS = getAssetSource(stats, 'main.css');
            const mainJS = getAssetSource(stats, 'main.js');
            const mainModule = evalCssJSModule(mainJS)
            const cssMainModule = mainModule.main.default;
            const cssChildModule = mainModule.child.child.default;


            matchRules(mainCSS, [
                `.${cssMainModule.root} .${cssMainModule.gaga}`,
                `.${cssChildModule.root} .${cssChildModule.baga}`
            ]);
        });

    });

    it('should order bundle from js imports + css imports', function () {
        const { run } = webpackTest({
            files: {
                '/main.js': jsThatImports(['./main.st.css', './child.js']),
                '/child.js': jsThatImports(['./child.st.css']),
                '/main.st.css': `
                    :import{
                        -st-from:'./child.st.css';
                        -st-default: Child;
                    }
                    .gaga{
                        -st-extends:Child;
                        color:red;
                    }
                `,
                '/child.st.css': `
                    .baga{
                        background:green;
                    }
                `
            },
            config: {
                entry: './main.js'
            }
        });

        return run().then(({ stats }) => {

            const mainCSS = getAssetSource(stats, 'main.css');
            const mainJS = getAssetSource(stats, 'main.js');
            const mainModule = evalCssJSModule(mainJS)
            const cssMainModule = mainModule.main.default;
            const cssChildModule = mainModule.child.child.default;


            matchRules(mainCSS, [
                `.${cssChildModule.root} .${cssChildModule.baga}`,
                `.${cssMainModule.root} .${cssMainModule.gaga}.${cssChildModule.root}`,
            ]);
        });

    });
    it('should put common CSS at the top according to JS dependency tree(weaker)', function () {

        const { run } = webpackTest({
            files: {
                '/entry.js': jsThatImports(['./common.st.css', './child.js', './entry.st.css']),
                '/child.js': jsThatImports(['./child.st.css', './common.st.css']),
                '/entry.st.css': `
                    .a { color:red; }
                `,
                '/common.st.css': `
                    .c { color:blue; }
                `,
                '/child.st.css': `
                    .b { color:green; }
                `
            },
            config: {
                entry: './entry.js'
            }
        });

        return run().then(({ stats }) => {

            const mainCSS = getAssetSource(stats, 'main.css');
            const cssAst = postcss.parse(mainCSS);
            const cRule = <postcss.Rule>cssAst.nodes![0];
            const bRule = <postcss.Rule>cssAst.nodes![1];
            const aRule = <postcss.Rule>cssAst.nodes![2];

            expect(cRule.nodes![0].toString(), 'common').to.equal(`color:blue`);
            expect(bRule.nodes![0].toString(), 'child').to.equal(`color:green`);
            expect(aRule.nodes![0].toString(), 'entry').to.equal(`color:red`);

        });

    });

    it('should move imported assets to output path and replace css with the asset new location', function () {
        const { run, fs } = webpackTest({
            files: {
                '/main.js': jsThatImports(['./main.st.css']),
                '/main.st.css': `
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
                '/asset.svg': '\n'
            },
            config: {
                output: {
                    path: '/dist'
                },
                entry: './main.js'
            }
        });

        return run().then(({ stats }) => {
            /* newline svg content hash */
            const assetHash = '68b329da9893e34099c7d8ad5cb9c940.svg';
            const asset = stats.compilation.assets[assetHash];
            const assetContent = fs.readFileSync(asset.existsAt).toString();
            expect(assetContent).to.equal('\n');
            expect(asset.existsAt).to.equal(`/dist/${assetHash}`);
            expect(asset.emitted).to.equal(true);

            const mainCSS = getAssetSource(stats, 'main.css');

            expect(mainCSS.match(new RegExp(assetHash, 'g')).length, 'replaced assets').to.equal(4);

        });

    });

    it('should not replace missing asset', function () {
        const { run } = webpackTest({
            files: {
                '/main.js': jsThatImports(['./main.st.css']),
                '/main.st.css': `
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
            },
            allowErrors: true,
            config: {
                entry: './main.js'
            }
        });

        return run().then(({ stats }) => {
            const mainCSS = getAssetSource(stats, 'main.css');
            expect(mainCSS.match(new RegExp('asset.svg', 'g')).length, 'not replaced assets').to.equal(4);
        });

    });

    it('should not replace base 64 images', function () {
        const img: string = `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjIiIHZpZXdCb3g9IjAgMCA4IDIiPiAgICA8cGF0aCBmaWxsPSIjRkZGIiBmaWxsLXJ1bGU9Im5vbnplcm8iIGQ9Ik0xIDJoNmExIDEgMCAwIDAgMC0ySDFhMSAxIDAgMCAwIDAgMnoiLz48L3N2Zz4=`
        const { run } = webpackTest({
            files: {
                '/main.js': jsThatImports(['./main.st.css']),
                '/main.st.css': `
                    .gaga{
                        background-image: url(${img});
                    }
    
                `
            },
            config: {
                entry: './main.js'
            }
        });

        return run().then(({ stats }) => {
            const css = getAssetSource(stats, 'main.css');
            expect(css).to.include(img);
        });

    });


    it('should not generate css for files imported only through css', function () {
        const { run } = webpackTest({
            files: {
                '/main.js': jsThatImports(['./main.st.css']),
                '/main.st.css': `
                    :import{
                        -st-from:'./child.st.css';
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
                '/child.st.css': `
                    .baga{
                        background:green;
                    }
                `
            },
            config: {
                entry: './main.js'
            }
        });

        return run().then(({ stats }) => {
            const mainCSS = getAssetSource(stats, 'main.css');
            expect(mainCSS.trim()).to.equal('');
        });

    });

    it('should generate css for theme imports (imported only through css)', function () {
        const { run } = webpackTest({
            files: {
                '/main.js': jsThatImports(['./main.st.css']),
                '/main.st.css': `
                    :import{
                        -st-theme: true;
                        -st-from:'./theme.st.css';
                    }
                    .gaga{
                        color:red;
                    }
                `,
                '/theme.st.css': `
                    .baga{
                        background:green;
                    }
                `
            },
            config: {
                entry: './main.js'
            }
        });

        return run().then(({ stats }) => {
            const mainJS = getAssetSource(stats, 'main.js');
            const mainCSS = getAssetSource(stats, 'main.css');
            const mainModule = evalCssJSModule(mainJS).main.default;

            matchRules(mainCSS, [
                /\.theme.+root\s.theme.+baga/,
                `.${mainModule.root.split(' ')[0]} .${mainModule.gaga}`
            ])
        });

    });

    it('should generate css for theme overrides', function () {
        const { run } = webpackTest({
            files: {
                '/main.js': jsThatImports(['./main.st.css']),
                '/main.st.css': `
                    :import{
                        -st-theme: true;
                        -st-from:'./theme.st.css';
                        color1: black;
                    }
                `,
                '/theme.st.css': `
                    :vars {
                        color1: purple;
                    }
                    .baga{
                        background:value(color1);
                    }
                `
            },
            config: {
                entry: './main.js'
            }
        });

        return run().then(({ stats }) => {
            // const mainJS = getAssetSource(stats, 'main.js');
            const mainCSS = getAssetSource(stats, 'main.css');
            // const mainModule = evalCssJSModule(mainJS).main.default;


            const cssAst = postcss.parse(mainCSS);
            const themeRulesetOriginal = <postcss.Rule>cssAst.nodes![0]!;
            const themeRulesetOverride = <postcss.Rule>cssAst.nodes![1]!;
            expect(themeRulesetOriginal.selector, 'theme selector original').to.match(/\.theme.+root\s.theme.+baga/);
            expect(themeRulesetOverride.selector, 'theme selector override').to.match(/\.main.+root\s.theme.+baga/);
            expect(themeRulesetOriginal.nodes![0].toString(), 'original declarations').to.equal('background:purple');
            expect(themeRulesetOverride.nodes![0].toString(), 'override declarations').to.equal('background:black');

        });

    });

    it('should generate css from JS mixin', function () {
        const { run, fs } = webpackTest({
            files: {
                '/main.js': jsThatImports(['./main.st.css']),
                '/main.st.css': `
                    :import{
                        -st-from:'./jsmixin.js';
                        -st-named: mixStuff;
                    }
                    .gaga{
                        color:red;
                        -st-mixin: mixStuff;
                    }
                `,
                '/jsmixin.js': `
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
            },
            stylableConfig: {
                requireModule: function (_path: string) {
                    return _eval(fs.readFileSync(_path).toString())
                }
            },
            config: {
                entry: './main.js'
            }
        });

        return run().then(({ stats }) => {
            const mainJS = getAssetSource(stats, 'main.js');
            const mainCSS = getAssetSource(stats, 'main.css');
            const mainModule = evalCssJSModule(mainJS).main.default;

            matchRules(mainCSS, [
                `.${mainModule.root} .${mainModule.gaga}`,
                `.${mainModule.root} .${mainModule.gaga} .${mainModule.child}`
            ])

        });

    });

    xit('should generate css from TS mixin (dose not eval ts)', function () {
        const { run, fs } = webpackTest({
            files: {
                '/main.js': jsThatImports(['./main.st.css']),
                '/main.st.css': `
                    :import{
                        -st-from:'./jsmixin.ts';
                        -st-named: mixStuff;
                    }
                    .gaga{
                        color:red;
                        -st-mixin: mixStuff;
                    }
                `,
                '/jsmixin.ts': `
                    module.exports.mixStuff =  function mixStuff(){
                        return {
                            "background":"green",
                            ".child":{
                                "color": "yellow"
                            }
                        }
                    }
                `
            },
            stylableConfig: {
                requireModule: function (_path: string) {
                    return _eval(fs.readFileSync(_path).toString())
                }
            },
            config: {
                entry: './main.js'
            }
        });

        return run().then(({ stats }) => {
            const mainJS = getAssetSource(stats, 'main.js');
            const mainCSS = getAssetSource(stats, 'main.css');
            const mainModule = evalCssJSModule(mainJS).main.default;

            matchRules(mainCSS, [
                `.${mainModule.root} .${mainModule.gaga}`,
                `.${mainModule.root} .${mainModule.gaga} .${mainModule.child}`
            ])

        });

    });

});
