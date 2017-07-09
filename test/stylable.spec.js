var fs = require('fs');
var path = require('path');
var expect = require('chai').expect;
var webpack = require('webpack');
var EnvPlugin = require('webpack/lib/web/WebEnvironmentPlugin');
var _eval = require('node-eval');
var MemoryFileSystem = require("memory-fs");
var memfs = new MemoryFileSystem();


describe('stylable-loader', function () {

	it('should work', function (done) {

		 new Promise(function (res, rej) {

			webpack({
				entry: path.join(__dirname, './test-main.stylable.css'),
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
							loader: path.join(__dirname, '../index')
						}
					]
				}
			}, function (err, stats) {
				if(err){return done(err)}
				var _exports = _eval(memfs.readFileSync('/bundle.js', 'utf8'));
				expect(_exports.classes).to.eql({class: 'class'});
				done(null);
			});

		});

	});

});
