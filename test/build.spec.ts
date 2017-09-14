import path = require('path');
import { expect } from 'chai';
import { Stylable } from 'stylable';
import { createFS, jsThatImports, webpackTest } from '../test-kit/index';
import { build } from '../src/build';



describe('build stand alone', function () {

    it('should create modules and copy source css files', function () {

        const fs = createFS({
            '/main.st.css': `
                :import{
                    -st-from: "./components/comp.st.css";
                    -st-default:Comp;
                }
                .gaga{
                    -st-extends:Comp;
                    color:blue;
                }
            `,
            '/components/comp.st.css': `
                .baga{
                    color:red;
                }
            `,
        });      

        const stylable = new Stylable('/', fs as any, () => ({}));

        build({
            extension: '.st.css', 
            fs: fs as any, 
            stylable,
            outDir: 'lib', 
            srcDir: '.', 
            rootDir: path.resolve('/')
        });

        [
            '/lib/main.st.css', 
            '/lib/main.st.css.js',
            '/lib/components/comp.st.css',
            '/lib/components/comp.st.css.js'
        ].forEach((p)=>{
            expect(fs.existsSync(path.resolve(p)), p).to.equal(true)
        });

    });

    //TODO: add content tests

})

describe("lib usage with loader", () => {

    it('should bundle 3rd party stylable project (project contain .st.css source files)', function () {


        const { run, resolve, evalCssJSModule } = webpackTest({
            files: {
                '/app.js': jsThatImports(['./main.st.css', 'my-lib/comp.js']),
                '/main.st.css': `
                    :import{
                        -st-from: "my-lib/comp.st.css";
                        -st-default:Comp;
                    }
                    .myClass{
                        -st-extends:Comp;
                        background:blue;
                    }
                    .myClass::sub-comp{
                        outline:pink;
                    }
                `,
                /* my-lib */
                '/node_modules/my-lib/package.json': `
                    {
                        "name":"my-lib"
                    }
                `,
                '/node_modules/my-lib/comp.js': jsThatImports(['./comp.st.css', './components/sub.js']),
                '/node_modules/my-lib/comp.st.css': `
                    :import{
                        -st-from:"./components/sub.st.css";
                        -st-default:Sub;
                    }
                    .sub-comp{
                        -st-extends:Sub;
                        color:blue;
                    }
                `,
                '/node_modules/my-lib/components/sub.js': jsThatImports(['./sub.st.css']),
                '/node_modules/my-lib/components/sub.st.css': `
                    .title{
                        color:red;
                        background: url("./asset.svg");
                    }
                `,
                '/node_modules/my-lib/components/asset.svg': `
                    <svg height="100" width="100">
                        <circle cx="50" cy="50" r="40" stroke="black" stroke-width="3" fill="red" />
                    </svg>
                `

            },
            config: {
                entry: './app.js'
            }
        });

        return run().then(({ stats }) => {
            const rawSource = stats.compilation.assets['main.css'];
            const bundleFiles = resolve([
                "/main.st.css", 
                "/node_modules/my-lib/comp.st.css", 
                "/node_modules/my-lib/components/sub.st.css"
            ]);
            expect(rawSource.fromFiles).to.eql(bundleFiles);

            const cssJSModules = bundleFiles
            .map((resource)=>stats.compilation.modules.find((m:any)=>m.resource === resource))
            .map((normalModule)=>evalCssJSModule(normalModule.originalSource().source()).default)

            expect(Object.keys(cssJSModules[0])).to.contain('myClass');
            expect(Object.keys(cssJSModules[0])).to.contain('root');
            expect(Object.keys(cssJSModules[0])).to.contain('$stylesheet');
            
            expect(rawSource.source()).to.not.include('/asset.svg')
        });

    });
})
