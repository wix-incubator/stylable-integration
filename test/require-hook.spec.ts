import { expect } from 'chai';
import { attachHook } from "../src/require-hook";
const idObj = require('identity-obj-proxy');

describe('require-hook', function () {

    it('load stylable css with require', function () {

        attachHook({ extension: '.css'});

        const res = require('./fixtures/test-main.st.css');

        expect(res.default.class).to.equal(res.default.$stylesheet.namespace + '--class')

    });

    it('load stylable css with require and dependencies', function () {
        let resCss;
        attachHook({
            extension: '.css',
            afterCompile: (code, filename) => {
                if (filename.match('import-relative-local.st.css')) {
                    resCss = code;
                }
                return code;
            },
            nsDelimiter: '----'
        });

        const res = require('./fixtures/import-relative-local.st.css');

        expect(res.default.class).to.equal(res.default.$stylesheet.namespace+'----class')
        expect(resCss).to.match(new RegExp(`[data-${res.default.$stylesheet.namespace}-mystate]`));
    });


    it('load stylable css with vars', function () {
        var called = false;
        attachHook({
            extension: '.css',
            afterCompile: (code, filename) => {
                if (filename.match('vars.st.css')) {
                    called = true;
                    expect(code).to.match(/color\s*:\s*#333/)
                }
                return code;
            }
        });

        require('./fixtures/vars.st.css');
        expect(called).to.equal(true);
    });

    it('load stylable css with imported vars', function () {
        var called = false;
        attachHook({
            extension: '.css',
            afterCompile: (code, filename) => {
                if (filename.match('imported-vars.st.css')) {
                    called = true;
                    expect(code).to.match(/color\s*:\s*#333/)
                }
                return code;
            }
        });

        require('./fixtures/imported-vars.st.css');
        expect(called).to.equal(true);
    });

    describe('preserve pre-defined css require hooks', function() {
      beforeEach(function (){
        require.extensions['.css'] = function(module) {
          module.exports = idObj;
        }
        attachHook({});
      });
      
      it('should call previous handler for css file', function() {
        const cssFile = require('./fixtures/simple.css');
        expect(cssFile.someClass).to.equal('someClass');
      });

      it('should not use previous handler for st.css file', function() {
        const cssFile = require('./fixtures/test-main.st.css');
        expect(cssFile.someClass).not.to.equal('someClass');
      });
    });
});
