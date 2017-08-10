import fs = require('fs');
import path = require('path');
import { expect } from 'chai';
import webpack = require('webpack');
import MemoryFileSystem = require('memory-fs');
import * as postcss from 'postcss';
const EnvPlugin = require('webpack/lib/web/WebEnvironmentPlugin');
const _eval = require('node-eval');
import { Plugin } from '../src/webpack-loader'
import { FSResolver } from '../src/fs-resolver';
import { fsLike } from '../src/types';
import { dirname } from 'path';
import { Resolver } from 'stylable'; //peer
import { dotLess, expectRule, expectRuleOrder, findDecl, findRule, getContentPath, getDistPath, getMemFs, getRuleValue, hasNoCls, isDecl, isRule, jsThatImports, nsChunk, nsSeparator, registerMemFs, selectorClsChunk, TestFunction, testJsEntries, testJsEntry, TestMultiEntries, testRule, testComplexRule, TestConfig, getAssetPath, testCssModule, evalCommonJsCssModule ,getAssetRegExp} from '../test-kit/index';
import { StylableIntegrationDefaults, StylableIntegrationOptions } from '../src/options';
import { build, globSearcher } from '../src/builder';
const testConfig: TestConfig = {
    rootPath: process.cwd(),
    distRelativePath: 'dist',
    assetsRelativePath: 'assets',
    contentRelativePath: 'sources',
    assetsServerUri: 'serve-assets',
    fileNameFormat:'[name].js'
}
const assetRegEx = getAssetRegExp(testConfig);

interface recursiveFsInternals { [fileName: string]: Buffer | recursiveFsInternals };

function searchForMatch(prefix: string, suffix: string, fsInt: recursiveFsInternals, rootPath: string, startPath: string = ''): string[] {
    let res: string[] = [];
    Object.keys(fsInt).forEach((fileName: string) => {
        let currentPath = path.join(startPath, fileName);
        if (currentPath === 'C:.') {
            currentPath = "C:";
        }
        const fileOrFolder = fsInt[fileName];
        if (fileOrFolder instanceof Buffer) {
            if (startsWith(currentPath, rootPath) && includes(currentPath, prefix) && endsWith(currentPath, suffix)) {
                res.push(path.relative(rootPath.toLowerCase(), currentPath.toLowerCase()));
            }
        } else {
            res = res.concat(searchForMatch(prefix, suffix, fileOrFolder, rootPath, currentPath));
        }
    });
    return res;
}

function endsWith(str: string, suffix: string) {
    return str.lastIndexOf(suffix) === str.length - suffix.length;
}
function includes(str: string, prefix: string) {
    return str.indexOf(prefix) !== -1;
}
function startsWith(str: string, prefix: string) {
    return str.toLowerCase().indexOf(prefix.toLowerCase()) === 0;
}

function mockGlob(fs: MemoryFileSystem, rootPath: string): globSearcher {
    return (match, options, cb) => {
        const supportedMatchFormat = '/**/*';
        if (match.indexOf(supportedMatchFormat) === -1) {
            throw new Error('match nor support in glob mock')
        } else {
            const splitMatch = match.split(supportedMatchFormat);
            const res = searchForMatch(splitMatch[0], splitMatch[1], fs.data, rootPath);
            cb(null, res)

        }
    }
}

type StringMap = { [key: string]: string };

describe('build stand alone', function () {
    it('should create modules and copy source css files', function () {
        const files = {
            'main.css': `
                :import{
                    -st-from:"./components/comp.css";
                    -st-default:Comp;
                }
                .gaga{
                    -st-extends:Comp;
                    color:blue;
                }
            `,
            'components/comp.css': `
                .baga{
                    color:red;
                }
            `,
        }
        const fs = getMemFs(files, testConfig.rootPath, testConfig.contentRelativePath);
        const resolver = new FSResolver('s', testConfig.rootPath, fs as any);
        build('**/*.css', fs as any, resolver, 'lib', testConfig.contentRelativePath, testConfig.rootPath, mockGlob(fs, testConfig.rootPath), (...args) => console.log(args));
        const outPath = path.join(testConfig.rootPath, 'lib');
        const mainModulePath = path.join(outPath, 'main.css.js');
        const subModulePath = path.join(outPath, 'components', 'comp.css.js');
        const mainModuleContent = fs.readFileSync(mainModulePath).toString();
        const subModuleContent = fs.readFileSync(subModulePath).toString();
        const evaledMain = evalCommonJsCssModule(mainModuleContent).default;
        const evaledSub = evalCommonJsCssModule(subModuleContent).default;
        const mainCssAst = postcss.parse(evaledMain.targetCss);
        const subCssAst = postcss.parse(evaledSub.targetCss);
        testRule(evaledSub, subCssAst, '.baga', 'color', 'red');
        testComplexRule(mainCssAst, [{ m: evaledMain, cls: '.gaga' }, { m: evaledSub, cls: '.root' }], 'color', 'blue');


        const mainCssPath = path.join(outPath, 'main.css.src');
        const subCssPath = path.join(outPath, 'components', 'comp.css.src');

        const mainCssContent = fs.readFileSync(mainCssPath).toString();
        const subCssContent = fs.readFileSync(subCssPath).toString();

        expect(mainCssContent).to.equal(files["main.css"]);
        expect(subCssContent).to.equal(files["components/comp.css"]);
    });

})
describe("lib usage with loader", () => {
    const libFiles: StringMap = {
        '../lib/comp.js': jsThatImports(['./comp.css', './components/sub.js']),
        '../lib/components/sub.js': jsThatImports(['./sub.css']),
        'comp.css': `
            :import{
                -st-from:"./components/sub.css";
                -st-default:Sub;
            }
            .sub-comp{
                -st-extends:Sub;
                color:blue;
            }
        `,
        'components/sub.css': `
            .title{
                color:red;
                background: url("./asset.svg");
            }
        `,
        'components/asset.svg':`
                <svg height="100" width="100">
                    <circle cx="50" cy="50" r="40" stroke="black" stroke-width="3" fill="red" />
                </svg>
        `,
        'package.json': `{
                "name":"my-lib"
        }`
    }
    const files: StringMap = {
        'app.js': jsThatImports(['./main.css', 'my-lib/lib/comp.js']),
        'main.css': `
            :import{
                -st-from:"my-lib/lib/comp.css"
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
        const resolver = new FSResolver('s', innerLibPath, fs as any);
        build('**/*.css', fs as any, resolver, 'lib', testConfig.contentRelativePath, innerLibPath, mockGlob(fs, innerLibPath), (...args) =>{});
        testJsEntry('app.js', fs, (bundle, css, memfs) => {
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

            expect(match!.length,'converted url count').to.equal(3);
            expect(memfs.readFileSync(getDistPath(testConfig)+'\\'+match![1]).toString()).to.eql(libFiles['components/asset.svg']);
            done()
        }, testConfig, { ...StylableIntegrationDefaults, injectFileCss: true })
    });

    it('should be usable as a component library in bundle mode', function (done) {
        const fs = getMemFs(files, testConfig.rootPath, testConfig.contentRelativePath);
        const resolver = new FSResolver('s', testConfig.rootPath, fs as any);
        const libRelPath = 'node_modules/my-lib';
        const innerLibPath = path.join(testConfig.rootPath, libRelPath);
        build('**/*.css', fs as any, resolver, 'lib', testConfig.contentRelativePath, innerLibPath, mockGlob(fs, innerLibPath), (...args) => {});
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
            expect(match!.length,'converted url count').to.equal(3);
            expect(memfs.readFileSync(getDistPath(testConfig)+'\\'+match![1]).toString()).to.eql(libFiles['components/asset.svg']);
            done()
        }, testConfig, { ...StylableIntegrationDefaults })
    });
})
