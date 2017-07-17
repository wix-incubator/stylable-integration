var fs = require('fs');
var path = require('path');
var expect = require('chai').expect;
var webpack = require('webpack');
var EnvPlugin = require('webpack/lib/web/WebEnvironmentPlugin');
var _eval = require('node-eval');
var MemoryFileSystem = require("memory-fs");
var murmurhash = require('murmurhash')

function testStyleEntry2(entry, test, options = {}) {
	var memfs = new MemoryFileSystem();
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
					loader: path.join(__dirname, '../index'),
					options: Object.assign({}, options)
				}
			]
		}
	}, function (err, stats) {
		if (err) { throw err; }
		const bundle = memfs.readFileSync('/bundle.js', 'utf8');
		test(_eval(bundle), bundle, stats);
	});
}

describe('stylable-loader', function () {


	it('source path', function (done) {
		const entry = path.join(__dirname, './fixtures/test-main.sb.css');
		testStyleEntry2(entry, function (sheet, bundle) {
			expect(sheet.source).to.eql(entry);
			done(null);
		});
	});

	it('export default stylesheet with classes', function (done) {
		testStyleEntry2(path.join(__dirname, './fixtures/test-main.sb.css'), function (sheet) {
			expect(sheet.classes).to.contain({ class: 'class' });
			done(null);
		});
	});

	it('add hash of from path entry', function (done) {
		const entry = path.join(__dirname, './fixtures/test-main.sb.css');
		const hash = murmurhash.v3(entry);
		testStyleEntry2(entry, function (sheet) {
			expect(sheet.namespace).to.eql('s' + hash);
			done(null);
		});
	});

	it('prefix namespace to the path hash', function (done) {
		const entry = path.join(__dirname, './fixtures/test-main-namespace.sb.css');
		const hash = murmurhash.v3(entry);
		testStyleEntry2(entry, function (sheet) {
			expect(sheet.namespace).to.eql('Test' + hash);
			done(null);
		});
	});


	it('prefix namespace to the path hash from the config options', function (done) {
		const prefix = "Prefix";
		const entry = path.join(__dirname, './fixtures/test-main.sb.css');
		const hash = murmurhash.v3(entry);
		testStyleEntry2(entry, function (sheet) {
			expect(sheet.namespace).to.eql(prefix + hash);
			done(null);
		}, {
			namespacelessPrefix: prefix
		});
	});


	it('should  resolve relative paths', function (done) {

		const entry = path.join(__dirname, './fixtures/import-relative.sb.css');
		const importPath1 = path.join(__dirname, './fixtures/my/path');
		const importPath2 = path.join(__dirname, '../my/path');

		testStyleEntry2(entry, function (sheet) {
			expect(sheet.imports[0].from).to.eql(importPath1);
			expect(sheet.imports[1].from).to.eql(importPath2);
			expect(sheet.imports[2].from).to.eql('@thing');
			done(null);
		});

	});



});
