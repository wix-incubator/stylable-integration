const webpack = require('webpack');
const path = require('path');
const entryFile = 'index.js';
const outDir = 'dist';
const distPath = path.join(process.cwd(),outDir);
const entryDistPath = path.join(distPath,entryFile)



const compiler = webpack({
        entryDistPath,
		output: {
			path:distPath,
			filename: '[name].js'
		}
    });
