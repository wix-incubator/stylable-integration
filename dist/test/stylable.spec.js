"use strict";
var fs = require('fs');
var path = require('path');
var expect = require('chai').expect;
var webpack = require('webpack');
var EnvPlugin = require('webpack/lib/web/WebEnvironmentPlugin');
var _eval = require('node-eval');
var MemoryFileSystem = require("memory-fs");
var murmurhash = require('murmurhash');
function testStyleEntry(entry, test, options) {
    if (options === void 0) { options = {}; }
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
                    loader: path.join(__dirname, '../dist/index'),
                    options: Object.assign({}, options)
                }
            ]
        }
    }, function (err, stats) {
        if (err) {
            throw err;
        }
        var bundle = memfs.readFileSync('/bundle.js', 'utf8');
        console.log(bundle);
        test(_eval(bundle), bundle, stats);
    });
}
describe('stylable-loader', function () {
    it('source path', function (done) {
        var entry = path.join(__dirname, './fixtures/imports.sb.css');
        testStyleEntry(entry, function (sheet, bundle) {
            expect(typeof sheet).to.eql('object');
            done(null);
        });
    });
});
