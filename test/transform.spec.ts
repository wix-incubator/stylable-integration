const expect = require('chai').expect;
const transform = require('../stylable-transform');

import {Resolver, Stylesheet} from "stylable";

describe('loader', function () {

    it('should output valid module', function () {

        const resolver = new Resolver({
            "C:\\Projects\\stylable-loader\\style.sb.css": new Stylesheet({})
        });

        const res = transform.transformStylableCSS(`

            :import("./style.sb.css"){}
        
        `, '', '', resolver, transform.defaults)

        expect(res.code).to.equal(``)


    })


});
