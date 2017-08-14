import { expect } from 'chai';
import * as path from 'path';
import * as transform from '../src/stylable-transform';
import { Resolver, Stylesheet } from 'stylable';
import { StylableIntegrationDefaults } from '../src/options';
const _eval = require('node-eval');
const separator: string = '💠';


const vanillaOptions = { assetsDir: 'assets', defaultPrefix: 's', assetsServerUri: '//', injectFileCss: false, injectBundleCss: false, nsDelimiter: separator };

describe('loader', function () {
    it('should transform imports', function () {

        const resolver = new Resolver({
            [path.join(process.cwd(), 'style.st.css')]: new Stylesheet({})
        });

        const res = transform.transformStylableCSS(`

            :import("./style.st.css"){}

        `, '', process.cwd(), resolver, vanillaOptions);

        const evaledRes = _eval(res.code, path.join(process.cwd(), 'src', 'style.st.css'));
        const expectedNs = "s0";
        const sheet = evaledRes.default.$stylesheet;

        expect(sheet.namespace).to.equal(expectedNs);
        expect(sheet.get('root')).to.equal(expectedNs + separator + "root");
    });


    it('should transform imports 2', function () {

        const resolver = new Resolver({
            [path.join(process.cwd(), 'style.st.css')]: new Stylesheet({})
        });

        const res = transform.transformStylableCSS(`

            :import {
                -st-from: "./style.st.css";
            }

        `, '', process.cwd(), resolver, StylableIntegrationDefaults)
        const evaledRes = _eval(res.code, path.join(process.cwd(), 'src', 'style.st.css'));
        const expectedNs = "s0";
        const sheet = evaledRes.default.$stylesheet;

        expect(sheet.namespace).to.equal(expectedNs);
        expect(sheet.get('root')).to.equal(expectedNs + separator + "root");
    });
});
