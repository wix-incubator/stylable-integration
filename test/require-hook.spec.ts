import { expect } from 'chai';
import { attachHook } from "../src/require-hook";

describe('require-hook', function () {

    it('load stylable css with require', function () {

        attachHook({ extension: '.css' });

        const res = require('./fixtures/test-main.sb.css');

        expect(res.default.class).to.equal('s1pi5dhd💠class')

    });

    it('load stylable css with require and dependencies', function () {

        attachHook({
            extension: '.css',
            afterCompile: (code, filename) => {
                if (filename.match('import-relative-local.sb.css')) {
                    expect(code).to.match(/\[data-s1u4nk48-mystate\]/)
                }
                return code;
            }
        });

        const res = require('./fixtures/import-relative-local.sb.css');

        expect(res.default.class).to.equal('s12yk899💠class')

    });


    it('load stylable css with vars', function () {
        var called = false;
        attachHook({
            extension: '.css',
            afterCompile: (code, filename) => {
                if (filename.match('vars.sb.css')) {
                    called = true;
                    expect(code).to.match(/color\s*:\s*#333/)
                }
                return code;
            }
        });

        const res = require('./fixtures/vars.sb.css');
        expect(called).to.equal(true);
    });

    
    it('load stylable css with imported vars', function () {
        var called = false;
        attachHook({
            extension: '.css',
            afterCompile: (code, filename) => {
                if (filename.match('imported-vars.sb.css')) {
                    called = true;
                    expect(code).to.match(/color\s*:\s*#333/)
                }
                return code;
            }
        });

        const res = require('./fixtures/imported-vars.sb.css');
        expect(called).to.equal(true);
    });


});
