# Stylable Integration
[![npm version](https://badge.fury.io/js/stylable-integration.svg)](https://www.npmjs.com/package/stylable-integration)
[![Build Status](https://travis-ci.com/wixplosives/stylable-integration.svg?token=JxepjChyzQB66ehAYhtG&branch=master)](https://travis-ci.com/wixplosives/stylable-integration)

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

## CLI

Once this package is installed, you can use a local CLI command to run the **Stylable** compiler.

Use the `stc` command to enable compiling `.st.css` files to their matching `.js` files, exporting a **Stylable** runtime stylesheet.

```bash
$ stc --help
Options:
  --rootDir   root directory of project                           [default: cwd]
  --srcDir    source directory relative to root                   [default: "."]
  --outDir    target directory relative to root                   [default: "."]
  --ext       extension of stylable CSS files               [default: ".st.css"]
  --log       verbose log                                       [default: false]
  -h, --help  Show help                                                [boolean]
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
        "build:style": "stc --srcDir=src --outDir=lib",
        ...
    }
}
```

## Webpack

Both a webpack loader and a plugin are exported via two special entry points.

The loader, exported via `stylable-integration/webpack-loader`, can be used in a webpack configuration as follows:

```js

{
    module: {
        rules: [
        ...
            {
                test: /\.st.css$/,
                loader: "stylable-integration/webpack-loader",
                options: { /* transformation options */ }
            }
        ...
        ]
    }
}

```

The plugin, exported via `stylable-integration/webpack-plugin`, can be used in a webpack configuration as follows:

```js
const StylablePlugin = require('stylable-integration/webpack-plugin');

{
    plugins: [
        new StylablePlugin({ /* transformation options */ })
    ]
}

```
The transformation options is an object, with the following default values:
```ts
{
    // should inject css bundle to head
    injectBundleCss: false,

    // whether each built .js file should include code that injects the raw CSS into the page (when loaded in the browser)
    injectFileCss: false,

    // delimiter used when namespacing selectors
    nsDelimiter: '💠'
}
```

## Node.js require hook

When running code directly in Node.js, any `require(...)` calls are handled by Node's own module system.

By default, Node supports the `require()` function for `.js` and `.json` files, but allows hooks to attach to additional file extensions.

This package exposes a special entry point that registers `.css` file handling, transpiling it for Node.js on-the-fly.

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

## CSS bundling

// TODO: implement and write.
