import { expect } from 'chai';
import * as path from 'path';

// import { createCSSModuleString } from '../src/stylable-transform';

// import { Stylable } from "stylable";
import { createWebpackCompiler, createFS, jsThatImports } from "../test-kit/index";

// const _eval = require('node-eval');


describe('webpack plugin', function () {

    it('create a bundle css', function (done) {
        
        const fs = createFS({
            '/entry.js': jsThatImports(['./style.st.css', './style2.st.css']),
            '/style.st.css': `
                .root {
                    color: red;
                }
            `,
            '/style2.st.css': `
                .root {
                    color: green;
                }
            `
        });

        const compiler = createWebpackCompiler({
            entry: './entry.js'
        }, fs);
        
        compiler.run((_err, stats: any) => {
            expect(stats.compilation.assets['main.css'].fromFiles).to.eql([
                path.resolve('/style2.st.css'),
                path.resolve('/style.st.css')
            ]);     

            done()
        });

    });

    it('report error when file not found', function (done) {
        
        const fs = createFS({
            '/entry.js': jsThatImports(['./style.st.css']),
            '/style.st.css': `
                .root {
                    :import {
                        -st-from: "./not-exist.st.css";
                    }
                }
            `
        });

        const compiler = createWebpackCompiler({
            entry: './entry.js'
        }, fs);
        
        compiler.run((_err, stats) => {
            const c = stats.toJson();
            expect(c.errors[0]).to.be.equal(`Error: no such file or directory "${path.resolve('/not-exist.st.css')}"`);
            expect(c.errors.length).to.equal(1);
            done()
        });

    });

    

});
