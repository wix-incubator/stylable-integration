var fs = require('fs');
var path = require('path');
var expect = require('chai').expect;
var webpack = require('webpack');
var EnvPlugin = require('webpack/lib/web/WebEnvironmentPlugin');
var _eval = require('node-eval');
var MemoryFileSystem = require("memory-fs");
var murmurhash = require('murmurhash')

function testStyleEntry(entry, test, options = {}) {	
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
		test(err, _eval(memfs.readFileSync('/bundle.js', 'utf8')));
	});
}

describe('stylable-loader', function () {

	it('export default stylesheet with classes', function (done) {
		testStyleEntry(path.join(__dirname, './fixtures/test-main.sb.css'), function (err, sheet) {
			if (err) { return done(err) }
			expect(sheet.classes).to.eql({ class: 'class' });
			done(null);
		});
	});

	it('add hash of from path entry', function (done) {
		const entry = path.join(__dirname, './fixtures/test-main.sb.css');
		const hash = murmurhash.v3(entry);
		testStyleEntry(entry, function (err, sheet) {
			if (err) { return done(err) }
			expect(sheet.namespace).to.eql('s' + hash);
			done(null);
		});
	});

	it('prefix namespace to the path hash', function (done) {
		const entry = path.join(__dirname, './fixtures/test-main-namespace.sb.css');
		const hash = murmurhash.v3(entry);
		testStyleEntry(entry, function (err, sheet) {
			if (err) { return done(err) }
			expect(sheet.namespace).to.eql('Test' + hash);
			done(null);
		});
	});

	
	it('prefix namespace to the path hash from the config options', function (done) {
		const prefix = "Prefix";
		const entry = path.join(__dirname, './fixtures/test-main.sb.css');
		const hash = murmurhash.v3(entry);
		testStyleEntry(entry, function (err, sheet) {
			if (err) { return done(err) }
			expect(sheet.namespace).to.eql(prefix + hash);
			done(null);
		}, {
			namespacelessPrefix: prefix
		});
	});



});
