import { expect } from 'chai';
import * as path from 'path';
import { createWebpackCompiler, createFS, jsThatImports } from "../test-kit/index";
import { Bundler, Stylable } from 'stylable';


describe('webpack plugin hooks', function () {

    it('transformHooks should be called when configured', function (done) {

        const fs = createFS({
            '/entry.js': jsThatImports(['./style.st.css']),
            '/style.st.css': `
                :vars {
                    color1: red;
                }
                .root {
                    color: value(color1);
                }
            `
        });

        const calls: string[] = [];

        const compiler = createWebpackCompiler({
            entry: './entry.js'
        }, fs, {
                transformHooks: {
                    postProcessor(res) {
                        calls.push('postProcessor');
                        return res;
                    },
                    replaceValueHook() {
                        calls.push('replaceValueHook');
                        return '';
                    }
                }
            });

        compiler.run((_err, _stats: any) => {
            expect(calls).to.eql([
                "replaceValueHook", // loader
                "postProcessor", // loader
                "replaceValueHook", // bundler
                "postProcessor" // bundler
            ]);
            done()
        });

    });

    it('bundleHook should be called when configured', function (done) {

        const fs = createFS({
            '/entry.js': jsThatImports(['./style.st.css']),
            '/style.st.css': `
                :vars {
                    color1: red;
                }
                .root {
                    color: value(color1);
                }
            `
        });

        let call: { 
            compilation: any, 
            chunk: any, 
            bundler: Bundler, 
            stylable: Stylable, 
            files: string[] 
        };

        const compiler = createWebpackCompiler({
            entry: './entry.js'
        }, fs, {
                bundleHook(compilation, chunk, bundler, stylable, files) {
                    call = {
                        compilation, chunk, bundler, stylable, files
                    }
                }
            });

        compiler.run((_err, stats: any) => {
            expect(call, 'bundleHook').to.exist;
            expect(call.files).to.eql([path.resolve("/style.st.css")]);
            expect(call.compilation).to.equal(stats.compilation);
            expect(call.chunk.name).to.equal('main');
            expect(stats.compilation.assets['main.css']).to.be.undefined;
            done()
        });

    });

});
