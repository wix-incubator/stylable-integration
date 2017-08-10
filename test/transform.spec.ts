import { expect } from 'chai';
import * as transform from '../src/stylable-transform';
import { Resolver, Stylesheet } from 'stylable';

describe('loader', function () {

    it('should output valid module', function () {

        const resolver = new Resolver({
            "f:\\style.sb.css": new Stylesheet({})
        });

        const res = transform.transformStylableCSS(`

            :import("./style.sb.css"){}

        `, '', 'f:/', resolver, transform.defaults)

        expect(res.code.replace(/\s*/gm, '')).to.equal(`
            Object.defineProperty(exports, "__esModule", { value: true });
            require("./style.sb.css");
            module.exports.default = require("stylable/runtime").create(
                "root",
                "s0",
                {"root":"s0💠root"},
                "",
                module.id
            );
        `.replace(/\s*/gm, ''))


    })


    it('should output valid module12', function () {

        const resolver = new Resolver({
            "f:\\style.sb.css": new Stylesheet({})
        });

        const res = transform.transformStylableCSS(`

            :import {
                -st-from: "./style.sb.css";
            }

        `, '', 'f:/', resolver, transform.defaults)

        expect(res.code.replace(/\s*/gm, '')).to.equal(`
            Object.defineProperty(exports, "__esModule", { value: true });
            require("./style.sb.css");
            module.exports.default = require("stylable/runtime").create(
                "root",
                "s0",
                {"root":"s0💠root"},
                "",
                module.id
            );
        `.replace(/\s*/gm, ''))


    })


});
