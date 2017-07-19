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

        expect(res.code).to.equal(``)


    })


    it('should output valid module12', function () {

        const resolver = new Resolver({
            "f:\\style.sb.css": new Stylesheet({})
        });

        const res = transform.transformStylableCSS(`

            :import {
                -sb-from: "./style.sb.css";
            }

        `, '', 'f:/', resolver, transform.defaults)

        expect(res.code).to.equal(``)


    })


});
