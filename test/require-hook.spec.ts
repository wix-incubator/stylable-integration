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
                if(filename.match('import-relative-local.sb.css')){
                    expect(code).to.match(/\[data-s1u4nk48-mystate\]/)
                }
                return code;
            }
        });

        const res = require('./fixtures/import-relative-local.sb.css');

        expect(res.default.class).to.equal('s12yk899💠class')

    });

});
