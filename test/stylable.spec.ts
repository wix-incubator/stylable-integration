import fs = require('fs');
import path = require('path');
import { expect } from 'chai';
import webpack = require('webpack');
import MemoryFileSystem = require('memory-fs');
const EnvPlugin = require('webpack/lib/web/WebEnvironmentPlugin');
const _eval = require('node-eval');
const murmurhash = require('murmurhash');

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
			new EnvPlugin(fs, memfs)
		],
		module: {
			rules: [
				{
					test: /\.css$/,
					loader: path.join(__dirname, '../webpack'),
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
			expect(bundle).to.match(new RegExp("[data-" + sheet.namespace + "-state]"));
			done(null);
		});

	});


});
