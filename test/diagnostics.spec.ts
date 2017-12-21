import { expect } from 'chai';
import { createWebpackCompiler, createFS, jsThatImports } from "../test-kit/index";

describe('Diagnostics', function () {

    it('report process diagnostics', function (done) {

        const fs = createFS({
            '/entry.js': jsThatImports(['./style.st.css']),
            '/style.st.css': `
                .root {
                    color: value(color1);
                }
            `
        });

        const compiler = createWebpackCompiler({
            entry: './entry.js'
        }, fs);

        compiler.run((_err, stats: any) => {
            expect(stats.compilation.warnings[0]).to.match(/unknown var "color1"/);
            done()
        });

    });

    it('report transform diagnostics', function (done) {

        const fs = createFS({
            '/entry.js': jsThatImports(['./style.st.css']),
            '/style.st.css': `
                :import {
                    -st-from: "./vars.st.css";
                    -st-named: color1;
                }
                .root {
                    color: value(color1);
                }
            `,
            "/vars.st.css": ``
        });

        const compiler = createWebpackCompiler({
            entry: './entry.js'
        }, fs);

        compiler.run((_err, stats: any) => {
            expect(stats.compilation.warnings[0]).to.match(/cannot find export 'color1' in '\.\/vars\.st\.css'/);
            done()
        });

    });


});
