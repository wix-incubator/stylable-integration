"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var expect = require('chai').expect;
var transform = require('../stylable-transform');
var stylable_1 = require("stylable");
describe('loader', function () {
    it('should output valid module', function () {
        var resolver = new stylable_1.Resolver({
            "C:\\Projects\\stylable-loader\\style.sb.css": new stylable_1.Stylesheet({})
        });
        var res = transform.transformStylableCSS("\n\n            :import(\"./style.sb.css\"){}\n        \n        ", '', '', resolver, { namespacelessPrefix: 's' });
        expect(res.code).to.equal("");
    });
});
