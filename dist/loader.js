"use strict";
var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
var fs_1 = require("fs");
var stylable_1 = require("stylable"); //peer
var stylable_transform_1 = require("./stylable-transform");
var loaderUtils = require('loader-utils');
function default_1(source) {
    var _this = this;
    var options = __assign({}, stylable_transform_1.defaults, loaderUtils.getOptions(this));
    var resolver = new stylable_1.Resolver({});
    resolver.resolveModule = function (path) {
        return stylable_transform_1.createStylesheetWithNamespace(fs_1.readFileSync(path, 'utf8'), path, options);
    };
    var _a = stylable_transform_1.transformStylableCSS(this, source, this.resourcePath, this.context, resolver, options), sheet = _a.sheet, code = _a.code;
    this.addDependency('stylable');
    sheet.imports.forEach(function (importDef) {
        _this.addDependency(importDef.from);
    });
    return code;
}
exports.default = default_1;
;
