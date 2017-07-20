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
});
