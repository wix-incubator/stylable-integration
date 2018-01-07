import { StylablePlugin } from '../src/webpack-loader';
import { expect } from 'chai';

const config = require('../test-kit/stylable.config');

class TestStylablePlugin extends StylablePlugin {
    loadLocalConfig() {
        return config;
    }
}

describe('StylablePlugin', () => {

    it('should hook plugin config through stylable.config.js', () => {
        const plugin = new TestStylablePlugin({});
        expect(plugin.options).to.contain({ testOptions: true });
    });

})