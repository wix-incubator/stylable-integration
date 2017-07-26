import fs = require('fs');
import path = require('path');
import { expect } from 'chai';
import webpack = require('webpack');
import MemoryFileSystem = require('memory-fs');

const EnvPlugin = require('webpack/lib/web/WebEnvironmentPlugin');
const _eval = require('node-eval');
const murmurhash = require('murmurhash');
import {Plugin} from '../src/webpack-loader'
type TestFunction = (evaluated: any, bundle: string, stats?: any) => void

function testStyleEntry(entry: string, test: TestFunction, options = {}) {
	const memfs = new MemoryFileSystem();
	webpack({
		entry: entry,
		output: {
			path: "/",
			filename: 'bundle.js'
		},
		plugins: [
            // new EnvPlugin(fs, memfs),
            new Plugin()

        ],
		module: {
			rules: [
				{
					test: /\.css$/,
					loader: path.join(process.cwd(), '/webpack'),
					options: Object.assign({}, options)
				}
			]
		}
	}, function (err: Error, stats: any) {
		if (err) { throw err; }
		const bundle = memfs.readFileSync('/bundle.js', 'utf8');
		// console.log(bundle)
		test(_eval(bundle), bundle, stats);
	});
}

function testJsEntry(entry: string,files:{[key:string]:string}, test: TestFunction, options = {}) {
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
	const compiler = webpack({
		entry: '/'+entry,
		output: {
			path:'/dist',
			filename: 'bundle.js'
		},
		plugins: [
            new Plugin()
        ],
		module: {
			rules: [
				{
					test: /\.css$/,
					loader: path.join(process.cwd(), '/webpack'),
					options: Object.assign({}, options)
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
		test(_eval(bundle), bundleCss, stats);
    })
}


describe.only('plugin', function(){
    it('should create modules and target css for css files imported from js',function(done){
        const files = {
            'main.js':`
                module.exports = require("./main.css");
            `,
            'main.css':`
                .gaga{
                    color:red;
                }
            `,
        }
        testJsEntry('main.js',files,(bundle,css)=>{
            const cssModule = bundle.default;
            console.log(css)
            const nsCls = cssModule.namespace+'💠gaga'
            expect(cssModule.rootClass).to.eql('root');
            expect(cssModule.namespaceMap.gaga).to.eql(nsCls);
            expect(css).to.eql(`.${nsCls} {\n    color: red\n}`);
            done();
        });
    });

})


describe('stylable-loader', function () {
	it('source path', function (done) {
		const entry = path.join(__dirname, './fixtures/imports.sb.css');
		testStyleEntry(entry, function (sheet, bundle) {
			expect(typeof sheet.default.$stylesheet).to.eql('object');
			expect(typeof sheet.default.class).to.eql('string');
			done(null);
		});
	});


	// it('export default stylesheet with classes', function (done) {
	// 	testStyleEntry(path.join(__dirname, './fixtures/test-main.sb.css'), function (sheet) {
	// 		expect(sheet.default).to.contain({ class: 'class' });
	// 		done(null);
	// 	});
	// });

	// it('add hash of from path entry', function (done) {
	// 	const entry = path.join(__dirname, './fixtures/test-main.sb.css');
	// 	const hash = murmurhash.v3(entry);
	// 	testStyleEntry(entry, function (sheet) {
	// 		expect(sheet.namespace).to.eql('s' + hash);
	// 		done(null);
	// 	});
	// });

	// it('prefix namespace to the path hash', function (done) {
	// 	const entry = path.join(__dirname, './fixtures/test-main-namespace.sb.css');
	// 	const hash = murmurhash.v3(entry);
	// 	testStyleEntry(entry, function (sheet) {
	// 		expect(sheet.namespace).to.eql('Test' + hash);
	// 		done(null);
	// 	});
	// });


	// it('prefix namespace to the path hash from the config options', function (done) {
	// 	const prefix = "Prefix";
	// 	const entry = path.join(__dirname, './fixtures/test-main.sb.css');
	// 	const hash = murmurhash.v3(entry);
	// 	testStyleEntry(entry, function (sheet) {
	// 		expect(sheet.namespace).to.eql(prefix + hash);
	// 		done(null);
	// 	}, {
	// 		namespacelessPrefix: prefix
	// 	});
	// });


	// it('should  resolve relative paths', function (done) {

	// 	const entry = path.join(__dirname, './fixtures/import-relative.sb.css');
	// 	const importPath1 = path.join(__dirname, './fixtures/my/path');
	// 	const importPath2 = path.join(__dirname, '../my/path');

	// 	testStyleEntry(entry, function (sheet) {
	// 		expect(sheet.imports[0].from).to.eql(importPath1);
	// 		expect(sheet.imports[1].from).to.eql(importPath2);
	// 		expect(sheet.imports[2].from).to.eql('@thing');
	// 		done(null);
	// 	});

	// });




	it('should state from inner dependency', function (done) {

		const entry = path.join(__dirname, './fixtures/3levels/level1.sb.css');

		testStyleEntry(entry, function (sheet, bundle) {
			expect(bundle).to.match(/[data-secihr9-state]/);
			done(null);
		});

	});


});
