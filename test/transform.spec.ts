import { expect } from 'chai';
import * as path from 'path';
import {createCSSModuleString} from '../src/stylable-transform';

import { Stylable } from "stylable";
import { getMemFs } from "../test-kit/index";
const _eval = require('node-eval');
const separator: string = '💠';


const vanillaOptions = { filename: 'bundle.css', assetsDir: 'assets', assetsServerUri: '//', injectFileCss: false, injectBundleCss: false, nsDelimiter: separator };

describe('loader', function () {


    it('should transform imports', function () {
        const fs = getMemFs({
            "style.st.css": `@namespace "Style";`,
            "entry.st.css": `:import { -st-from: "./style.st.css"; }`
        }, process.cwd(), '/');

        const stylable = new Stylable(process.cwd(), fs as any, ()=>({}), separator);
        const entryPath = path.join(process.cwd() + '/entry.st.css');
        const {exports, meta} = stylable.transform(fs.readFileSync(entryPath).toString(), entryPath)
        const code = createCSSModuleString(exports, meta, vanillaOptions);

        const evaledRes = _eval(code, path.join(process.cwd(), 'src', 'style.st.css'));
        
        const sheet = evaledRes.default.$stylesheet;

        expect(sheet.namespace).to.match(/^entry/);
        expect(sheet.get('root')).to.match(new RegExp('^entry\\d+' + separator + 'root'));
        expect(evaledRes.default.root).to.match(new RegExp('^entry\\d+' + separator + 'root'));
    });

});
