import path = require('path');
import { expect } from 'chai';
import * as postcss from 'postcss';
import { Stylable } from 'stylable';
import { getDistPath, getMemFs, jsThatImports, testJsEntry, testRule, testComplexRule, TestConfig, evalCommonJsCssModule, getAssetRegExp } from '../test-kit/index';
import { StylableIntegrationDefaults } from '../src/options';
import { build } from '../src/build';

const testConfig: TestConfig = {
    // 'c:\\project' on Windows; '/project' on posix
    rootPath: path.resolve('/project'),
    distRelativePath: 'dist',
    assetsRelativePath: 'assets',
    contentRelativePath: 'sources',
    assetsServerUri: 'serve-assets',
    fileNameFormat: '[name].js'
}

const assetRegEx = getAssetRegExp(testConfig);

type StringMap = { [key: string]: string };

describe('build stand alone', function () {
    it('should create modules and copy source css files', function () {
        const files = {
            'main.st.css': `
                :import{
                    -st-from: "./components/comp.st.css";
                    -st-default:Comp;
                }
                .gaga{
                    -st-extends:Comp;
                    color:blue;
                }
            `,
            'components/comp.st.css': `
                .baga{
                    color:red;
                }
            `,
        }
        const fs = getMemFs(files, testConfig.rootPath, testConfig.contentRelativePath);
        
        const stylable = new Stylable(testConfig.rootPath, fs as any, ()=>({}), StylableIntegrationDefaults.nsDelimiter);

        build({
            extension: '.st.css', fs: fs as any, stylable,
            outDir: 'lib', srcDir: testConfig.contentRelativePath, rootDir: testConfig.rootPath
        });

        const outPath = path.join(testConfig.rootPath, 'lib');
        const mainModulePath = path.join(outPath, 'main.st.css.js');
        const subModulePath = path.join(outPath, 'components', 'comp.st.css.js');
        const mainModuleContent = fs.readFileSync(mainModulePath).toString();
        const subModuleContent = fs.readFileSync(subModulePath).toString();
        const evaledMain = evalCommonJsCssModule(mainModuleContent).default;
        const evaledSub = evalCommonJsCssModule(subModuleContent).default;
        const mainCssAst = postcss.parse(evaledMain.targetCss);
        const subCssAst = postcss.parse(evaledSub.targetCss);
        testRule(evaledSub, subCssAst, '.baga', 'color', 'red');
        testComplexRule(mainCssAst, [{ m: evaledMain, cls: '.gaga' }, { m: evaledSub, cls: '.root' }], 'color', 'blue');


        const mainCssPath = path.join(outPath, 'main.st.css');
        const subCssPath = path.join(outPath, 'components', 'comp.st.css');

        const mainCssContent = fs.readFileSync(mainCssPath).toString();
        const subCssContent = fs.readFileSync(subCssPath).toString();

        expect(mainCssContent).to.equal(files["main.st.css"]);
        expect(subCssContent).to.equal(files["components/comp.st.css"]);
    });

})
describe("lib usage with loader", () => {
    const libFiles: StringMap = {
        '../lib/comp.js': jsThatImports(['./comp.st.css', './components/sub.js']),
        '../lib/components/sub.js': jsThatImports(['./sub.st.css']),
        'comp.st.css': `
            :import{
                -st-from:"./components/sub.st.css";
                -st-default:Sub;
            }
            .sub-comp{
                -st-extends:Sub;
                color:blue;
            }
        `,
        'components/sub.st.css': `
            .title{
                color:red;
                background: url("./asset.svg");
            }
        `,
        'components/asset.svg': `
                <svg height="100" width="100">
                    <circle cx="50" cy="50" r="40" stroke="black" stroke-width="3" fill="red" />
                </svg>
        `,
        '../package.json': `{
                "name":"my-lib"
        }`
    }
    const files: StringMap = {
        'app.js': jsThatImports(['./main.st.css', 'my-lib/lib/comp.js']),
        'main.st.css': `
            :import{
                -st-from:"my-lib/lib/comp.st.css"
                -st-default:Comp;
            }
            .gaga{
                -st-extends:Comp;
                background:blue;
            }
            .gaga::sub-comp{
                outline:pink;
            }
        `
    };
    Object.keys(libFiles).forEach((filePath) => {
        files[path.join('../', 'node_modules', 'my-lib', 'sources', filePath)] = libFiles[filePath];
    });
    it('should be usable as a component library with injectFileCss mode', function (done) {
        const fs = getMemFs(files, testConfig.rootPath, testConfig.contentRelativePath);
        const libRelPath = 'node_modules/my-lib';
        const innerLibPath = path.join(testConfig.rootPath, libRelPath);
        

           
        const stylable = new Stylable(testConfig.rootPath, fs as any, ()=>({}));
        // build lib
        build({
            rootDir: innerLibPath, srcDir: testConfig.contentRelativePath, outDir: 'lib',
            extension: '.st.css', fs: fs as any, stylable
        });

        testJsEntry('app.js', fs, (bundle, _css, memfs) => {
            const mainModule = bundle.main.default;
            const compModule = bundle['my-lib/lib/comp'].comp.default
            const subModule = bundle['my-lib/lib/comp']["components/sub"].sub.default

            const mainModuleTargetAst = postcss.parse(mainModule.targetCss);
            const compModuleTargetAst = postcss.parse(compModule.targetCss);
            const subModuleTargetAst = postcss.parse(subModule.targetCss);



            testRule(subModule, subModuleTargetAst, '.title', 'color', 'red');
            testComplexRule(compModuleTargetAst, [{ m: compModule, cls: '.sub-comp' }, { m: subModule, cls: '.root' }], 'color', 'blue');
            testComplexRule(mainModuleTargetAst, [{ m: mainModule, cls: '.gaga' }, { m: compModule, cls: '.root' }], 'background', 'blue');
            testComplexRule(mainModuleTargetAst, [{ m: mainModule, cls: '.gaga' }, { m: compModule, cls: '.sub-comp' }], 'outline', 'pink');



            expect(subModule.targetCss).to.not.include('url("./asset.svg")')
            const match = subModule.targetCss.split(assetRegEx);

            expect(match!.length, 'converted url count').to.equal(3);
            expect(memfs.readFileSync(path.join(getDistPath(testConfig), match![1])).toString()).to.eql(libFiles['components/asset.svg']);
            done()
        }, testConfig, { ...StylableIntegrationDefaults, injectFileCss: true })
    });

    it('should be usable as a component library in bundle mode', function (done) {
        const fs = getMemFs(files, testConfig.rootPath, testConfig.contentRelativePath);
        
        const libRelPath = 'node_modules/my-lib';
        const innerLibPath = path.join(testConfig.rootPath, libRelPath);
        const stylable = new Stylable(testConfig.rootPath, fs as any, ()=>({}));
        build({
            rootDir: innerLibPath, 
            srcDir: testConfig.contentRelativePath, 
            outDir: 'lib',
            extension: '.st.css', 
            fs: fs as any, 
            stylable
        });

        testJsEntry('app.js', fs, (bundle, css, memfs) => {
            const mainModule = bundle.main.default;
            const compModule = bundle['my-lib/lib/comp'].comp.default
            const subModule = bundle['my-lib/lib/comp']["components/sub"].sub.default

            const cssAst = postcss.parse(css);
            testRule(subModule, cssAst, '.title', 'color', 'red');
            testComplexRule(cssAst, [{ m: compModule, cls: '.sub-comp' }, { m: subModule, cls: '.root' }], 'color', 'blue');
            testComplexRule(cssAst, [{ m: mainModule, cls: '.gaga' }, { m: compModule, cls: '.root' }], 'background', 'blue');
            testComplexRule(cssAst, [{ m: mainModule, cls: '.gaga' }, { m: compModule, cls: '.sub-comp' }], 'outline', 'pink');



            expect(css).to.not.include('url("./asset.svg")')
            const match = css.split(assetRegEx);
            expect(match!.length, 'converted url count').to.equal(3);
            expect(memfs.readFileSync(path.join(getDistPath(testConfig), match![1])).toString()).to.eql(libFiles['components/asset.svg']);
            done()
        }, testConfig, { ...StylableIntegrationDefaults })
    });
})
