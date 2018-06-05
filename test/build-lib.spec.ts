import path = require('path');
import { expect } from 'chai';
import { Stylable } from 'stylable';
import { createFS } from '../test-kit/index';
import { build } from '../src/build';



describe('build index', function () {

    it('should create index file importing all matched stylesheets in srcDir', function () {

        const fs = createFS({
            '/compA.st.css': `
               .a{}
            `,
            '/a/b/compB.st.css': `
               .b{}
            `
        });

        const stylable = new Stylable('/', fs as any, () => ({}));

        build({
            extension: '.st.css',
            fs: fs as any,
            stylable,
            outDir: '.',
            srcDir: '.',
            indexFile: "index.st.css",
            rootDir: path.resolve('/')
        });

        const res = fs.readFileSync(path.resolve('/index.st.css')).toString();

        expect(res.trim()).to.equal([
            ':import {-st-from: "./compA.st.css";-st-default:CompA;}',
            '.root CompA{}',
            ':import {-st-from: "./a/b/compB.st.css";-st-default:CompB;}',
            '.root CompB{}'
        ].join('\n'));

    });
    it('should handle name collisions by appending parent dir', function () {

        const fs = createFS({
            '/comp.st.css': `
               .a{}
            `,
            '/a/comp.st.css': `
               .b{}
            `
        });

        const stylable = new Stylable('/', fs as any, () => ({}));
        expect(() => {
            build({
                extension: '.st.css',
                fs: fs as any,
                stylable,
                outDir: '.',
                srcDir: '.',
                indexFile: "index.st.css",
                rootDir: path.resolve('/')
            });
        }).to.throw(`Name Collision Error: ${path.resolve('/comp.st.css')} and ${path.resolve('/a/comp.st.css')} has the same filename`)

    });

})
