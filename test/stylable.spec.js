var fs = require('fs');
var path = require('path');
var webpack = require('webpack');
var EnvPlugin = require('webpack/lib/web/WebEnvironmentPlugin');

var MemoryFileSystem = require("memory-fs");
var memfs = new MemoryFileSystem();


describe('stylable-loader', function () {
	it('should work', function () {

		return new Promise(function (res, rej) {

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
				if(err){return rej(err)}
				console.log(stats.compilation.modules, memfs.readFileSync('/bundle.js', 'utf8'));
			});

		});

	});

});
