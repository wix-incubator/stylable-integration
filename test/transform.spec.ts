import { expect } from 'chai';
import * as path from 'path';
import * as transform from '../src/stylable-transform';

import { createResolver } from "../src/fs-resolver";
import { getMemFs } from "../test-kit/index";
const _eval = require('node-eval');
const separator: string = '💠';


const vanillaOptions = { assetsDir: 'assets', defaultPrefix: 's', assetsServerUri: '//', injectFileCss: false, injectBundleCss: false, nsDelimiter: separator };

describe('loader', function () {


    it('should transform imports', function () {


        const fs = getMemFs({
            "style.st.css": `@namespace "Style";`,
            "entry.st.css": `:import { -st-from: "./style.st.css"; }`
        }, process.cwd(), '/');

        const resolver = createResolver(process.cwd(), fs as any);
        const entryPath = path.join(process.cwd() + '/entry.st.css');
        const res = transform.transformStylableCSS(fs.readFileSync(entryPath), entryPath, resolver, vanillaOptions);

        const evaledRes = _eval(res.code, path.join(process.cwd(), 'src', 'style.st.css'));
        
        const sheet = evaledRes.default.$stylesheet;

        expect(sheet.namespace).to.match(/^entry/);
        expect(sheet.get('root')).to.match(new RegExp('^entry\\d+' + separator + 'root'));
        expect(evaledRes.default.root).to.match(new RegExp('^entry\\d+' + separator + 'root'));
    });

});
