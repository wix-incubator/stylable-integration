import { expect } from 'chai';
import { attachHook } from "../src/require-hook";


describe('require-hook', function () {

    it('load stylable css with require', function () {

        attachHook({ extension: '.css'});

        const res = require('./fixtures/test-main.sb.css');

        expect(res.default.class).to.equal(res.default.$stylesheet.namespace + '--class')

    });

    it('load stylable css with require and dependencies', function () {
        let resCss;
        attachHook({
            extension: '.css',
            afterCompile: (code, filename) => {
                if (filename.match('import-relative-local.sb.css')) {
                    resCss = code;
                }
                return code;
            },
            nsDelimiter: '----'
        });

        const res = require('./fixtures/import-relative-local.sb.css');

        expect(res.default.class).to.equal(res.default.$stylesheet.namespace+'----class')
        expect(resCss).to.match(new RegExp(`[data-${res.default.$stylesheet.namespace}-mystate]`));
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

        require('./fixtures/vars.sb.css');
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

        require('./fixtures/imported-vars.sb.css');
        expect(called).to.equal(true);
    });

});
