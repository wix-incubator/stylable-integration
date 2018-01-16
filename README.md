# Stylable Integration
[![npm version](https://badge.fury.io/js/stylable-integration.svg)](https://www.npmjs.com/package/stylable-integration)
[![Build Status](https://travis-ci.org/wix/stylable-integration.svg?branch=master)](https://travis-ci.org/wix/stylable-integration)

This package contains build-time utilities for integrating **Stylable** into your project.

The following are included:
- CLI for compiling `.st.css` files to `.js` files, each exporting a runtime **Stylable** stylesheet.
- Webpack loader and plugin, for web applications using webpack as their build system.
- Node.js requires a hook which provides `.st.css` support for Node's native `require(...)` function.

## Getting started

Install `stylable-integration` as a dev dependency in your local project.

Install using `npm`:

```bash
npm install stylable-integration --save-dev
```

Or install using `yarn`:

```bash
yarn add stylable-integration --dev
```

## Webpack

Both a webpack loader and a plugin are exported via two special entry points.

The loader, exported via `stylable-integration/webpack-loader`.

The plugin, exported via `stylable-integration/webpack-plugin`.

Both must be used in the webpack configuration with the same transformation options as follows:

```js
const StylablePlugin = require('stylable-integration/webpack-plugin');
...
{
    module: {
        rules: [
            StylablePlugin.rule(),
            // in order to load css assets from bundle we need the url loader configured.
            // example configuration
            {
                test: /\.(png|jpg|gif|svg)$/,
                use: [
                    {
                        loader: 'url-loader',
                        options: {
                            limit: 8192
                        }
                    }
                ]
            }
        ]
    },
    plugins: [
        new StylablePlugin({ injectBundleCss: true /* dev mode */})
    ]
}

```


The transformation options is an object, with the following default values:
```ts
{
    // should inject css bundle to the document head when run browsers
    injectBundleCss: false,

    // the name of the css bundle
    filename: '[name].css',

    // delimiter used when namespacing selectors
    nsDelimiter: '💠'
}
```

## CLI

Once this package is installed, you can use a local CLI command to run the **Stylable** compiler.

Use the `stc` command to enable compiling `.st.css` files to their matching `.js` files, exporting a **Stylable** runtime stylesheet.

```bash
$ stc --help
Options:
  --rootDir      root directory of project                        [default: cwd]
  --srcDir       source directory relative to root                [default: "."]
  --outDir       target directory relative to root                [default: "."]
  --indexFile    filename of the generated index       [default: "index.st.css"]
  --ext          extension of stylable css files            [default: ".st.css"]
  --log          verbose log                                    [default: false]
  --diagnostics  verbose diagnostics                            [default: false]
  -h, --help     Show help                                             [boolean]
```

By default, `stc` runs on the current working directory, compiling each `.st.css` source file to a `.js` file in the same directory.

For example, the file:

`/project/src/components/button/button.st.css`

is compiled into:

`/project/src/components/button/button.st.css.js`.

If your project uses transpilation into an output directory, then you should provide `srcDir` and `outDir` parameters.

A common use case of this utility is running it via an `npm` script in the project's `package.json` as follows:

```js
{
    "name": "my-project",
    ...
    "scripts": {
        "build:style": "stc --srcDir=src --outDir=lib --diagnostics",
        ...
    }
}
```


## Node.js require hook

When running code directly in Node.js, any `require(...)` calls are handled by Node's own module system.

By default, Node supports the `require()` function for `.js` and `.json` files, but allows hooks to attach to additional file extensions.

This package exposes a special entry point that registers `.css` file handling, transpiling it for Node.js on-the-fly.

Note that no css will be actually applied this will only generate the js module.

To register the hook, use the dedicated entry point:

```ts
import 'stylable-integration/require';
```

Or, if using CommonJS:

```js
require('stylable-integration/require');
```

The require hook can also be used to register the handling in tools like Mocha:

```bash
$ mocha --compilers css:stylable-integration/require [test file]
```
