import { expect } from 'chai';
import * as path from 'path';

// import { createCSSModuleString } from '../src/stylable-transform';

import * as webpack from "webpack";
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
                :import {
                    -st-from: "./not-exist.st.css";
                }
                .root {}
            `
        });

        const compiler = createWebpackCompiler({
            entry: './entry.js'
        }, fs);

        compiler.run((_err, stats) => {
            const c = stats.toJson();
            expect(c.errors[1]).to.be.equal(`Error: no such file or directory "${path.resolve('/not-exist.st.css')}"`);
            expect(c.errors.length).to.equal(2);
            done()
        });

    });

    it('Experiment: plain plugin', function (done) {

        const fs = createFS({
            '/entry.js': jsThatImports(['./style.st.css']),
            '/style.st.css': `
                :import {
                    -st-from: "./not-exist.st.css";
                }
                .root {
                    color: red;
                }
            `
        });

        const compiler = createWebpackCompiler({
            entry: './entry.js'
        }, fs);


        var tests: Array<(_: webpack.Stats) => void> = [
            () => {
                fs.writeFileSync(path.resolve('/style.st.css'), `
                    .root {
                        color: green;
                    }
                `)
                watching.invalidate();
            },
            () => {
                watching.close(done)
            }
        ];

        var watching = compiler.watch({}, (_err, stats) => tests.shift()!(stats));

    });

    it('Experiment: with css-loader', function (done) {

        const fs = createFS({
            '/entry.js': jsThatImports(['./theme/theme.st.css', './comp.st.css']),
            '/entry2.js': jsThatImports(['./comp.st.css']),
            '/comp.st.css': `
                :import {
                    -st-from: './theme/theme.st.css';
                    -st-named: icon;
                }
                .root {
                    color: red;
                    background: url("./asset.svg");
                    background-image: value(icon);
                }
            `,
            '/asset.svg': `<svg id="asset"></svg>`,

            '/theme/theme.st.css': `
                :vars {
                    icon: url("./icon.svg");
                }

                Comp{}
            `,
            '/theme/icon.svg': `<svg id="icon"></svg>`
        });

        const compiler = createWebpackCompiler({
            entry: {
                a: './entry.js',
                b: './entry2.js'
            }
        }, fs);



        var tests: Array<(_: webpack.Stats) => void> = [
            () => {
                fs.writeFileSync(path.resolve('/theme/icon.svg'), `
                    <svg id="new-icon"></svg>
                `)
                watching.invalidate();
            },
            () => {
                watching.close(done)
            }
        ];

        var watching = compiler.watch({}, (_err, stats) => tests.shift()!(stats));



    });

    it('dynamic loading', function (done) {

        const fs = createFS({
            '/entry.js': `
                module.exports = {
                    style: require('./style.st.css'),
                    loadDynamic(){
                        return import('./dynamic.js');
                    }
                }
                    `,
            '/dynamic.js': `
                module.exports = {
                    'dynamic-style': require('./dynamic-style.st.css')                            
                }
                    `,
            '/style.st.css': `
                .root {
                    color: red;
                }
            `,
            '/dynamic-style.st.css': `
                .root {
                    color: red;
                }
                    `
        });

        const compiler = createWebpackCompiler({
            entry: './entry.js'
        }, fs, { injectBundleCss: true });


        compiler.run((_err, stats: any) => {
            expect(stats.compilation.assets['main.css'].fromFiles).to.eql([
                path.resolve("/dynamic-style.st.css"),
                path.resolve("/style.st.css")
            ]);
            done()
        });

    });

    it('dynamic loading (order from css)', function (done) {

        const fs = createFS({
            '/entry.js': `
                module.exports = {
                    style: require('./style.st.css'),
                    loadDynamic(){
                        return import('./dynamic.js');
                    }
                }
                            `,
            '/dynamic.js': `
                module.exports = {
                    'dynamic-style': require('./dynamic-style.st.css')                            
                }
                            `,
            '/style.st.css': `
                :import {
                    -st-from: "./dynamic-style.st.css";
                    -st-default: Dynamic;
                }
                .root {
                    color: red;
                }
                            `,
            '/dynamic-style.st.css': `
                .root {
                    color: red;
                }
                            `
        });

        const compiler = createWebpackCompiler({
            entry: './entry.js'
        }, fs, { injectBundleCss: true });


        compiler.run((_err, stats: any) => {

            expect(stats.compilation.assets['main.css'].fromFiles).to.eql([
                path.resolve("/style.st.css"),
                path.resolve("/dynamic-style.st.css")
            ]);
            done()
        });

    });

    it('dynamic loading (order from css check duplicates)', function (done) {

        const fs = createFS({
            '/entry.js': `
                module.exports = {
                    style: require('./style.st.css'),
                    style: require('./dynamic-style.st.css'),
                    loadDynamic(){
                        return import('./dynamic.js');
                    }
                }
                            `,
            '/dynamic.js': `
                module.exports = {
                    'dynamic-style': require('./dynamic-style.st.css')                            
                }
                            `,
            '/style.st.css': `
                :import {
                    -st-from: "./dynamic-style.st.css";
                    -st-default: Dynamic;
                }
                .root {
                    color: red;
                }
                            `,
            '/dynamic-style.st.css': `
                .root {
                    color: red;
                }
                            `
        });

        const compiler = createWebpackCompiler({
            entry: './entry.js'
        }, fs, { injectBundleCss: true });


        compiler.run((_err, stats: any) => {
            expect(stats.compilation.assets['main.css'].fromFiles).to.eql([
                path.resolve("/style.st.css"),
                path.resolve("/dynamic-style.st.css")
            ]);
            done()
        });

    });


    it('common style between entry and dynamic', function (done) {

        const fs = createFS({
            '/entry.js': `
                module.exports = {
                    style: require('./style.st.css'),
                    shared: require('./shared-style.st.css'),
                    loadDynamic(){
                        return import('./dynamic.js');
                    }
                }
                            `,
            '/dynamic.js': `
                module.exports = {
                    'dynamic-style': require('./dynamic-style.st.css')                            
                }
                            `,
            '/style.st.css': `
                :import {
                    -st-from: "./dynamic-style.st.css";
                    -st-default: Dynamic;
                }
                :import {
                    -st-from: "./shared-style.st.css";
                    -st-default: Shared;
                }
                .root {
                    color: red;
                }
                            `,
            '/dynamic-style.st.css': `
                :import {
                    -st-from: "./shared-style.st.css";
                    -st-default: Shared;
                }
                .root {
                    color: red;
                }
            `,
            '/shared-style.st.css': `
                .root {
                    color: red;
                }
        `
        });

        const compiler = createWebpackCompiler({
            entry: './entry.js'
        }, fs, { injectBundleCss: true });


        compiler.run((_err, stats: any) => {
            expect(stats.compilation.assets['main.css'].fromFiles).to.eql([
                path.resolve("/style.st.css"),
                path.resolve("/dynamic-style.st.css"),
                path.resolve("/shared-style.st.css")
            ]);
            done()
        });

    });



    it('exposes both css and js in stats (used by html plugin)', function (done) {

        const fs = createFS({
            '/entry.js': `
                module.exports = {
                    style: require('./style.st.css'),
                    
                }
            `,
            '/style.st.css': ` script for appending to 
                .root {
                    color: red;
                }
            `,

        });

        const compiler = createWebpackCompiler({
            entry: './entry.js'
        }, fs, { injectBundleCss: false });


        compiler.run((_err, stats: any) => {
            expect(stats.compilation.chunks[0].files).to.contain('main.css');
            expect(stats.compilation.chunks[0].files).to.contain('main.js');
            done()
        });

    });


    it('with css-loader', function (done) {

        const fs = createFS({
            '/entry.js': jsThatImports(['./file.svg', './style.st.css']),
            '/file.svg': `<svg id="asset"></svg>`,
            '/style.st.css': ``
        });

        const compiler = createWebpackCompiler({
            entry: './entry.js',
            
        }, fs);

        compiler.run((_err, _stats: any) => {
           
            done()
        });
    });


});
