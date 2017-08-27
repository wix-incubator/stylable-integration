# Stylable Integration
[![npm version](https://badge.fury.io/js/stylable-integration.svg)](https://www.npmjs.com/package/stylable-integration)
[![Build Status](https://travis-ci.com/wixplosives/stylable-integration.svg?token=JxepjChyzQB66ehAYhtG&branch=master)](https://travis-ci.com/wixplosives/stylable-integration)

This package contains build-time utilities for integration of `stylable` into your project.

The following are included:
- CLI for compiling `.st.css` files to `.js` files, each exporting a runtime `stylable` stylesheet.
- Webpack loader and plugin, for web applications using webpack as their build system.
- Node.js require hook which provides `.st.css` support in Node's native `require(...)` function.

## Getting started

We begin by installing stylable-integration as a dev dependency in our local project.

This can be done using `npm`:

```bash
npm install stylable-integration --save-dev
```

or using `yarn`:

```bash
yarn add stylable-integration --dev
```

It should be noted `stylable-integration` requires `stylable` (it is a peer dependency), so your project must have a compatible `stylable` version installed for the integration to function.

## CLI

Once this package is installed, a local CLI command named `stc` (stylable compiler) is available.

`stc` allows compiling `.st.css` files to their matching `.js` files, each exporting a `stylable` runtime stylesheet.

```bash
$ stc --help
Options:
  --rootDir   root directory of project                           [default: cwd]
  --srcDir    source directory relative to root                   [default: "."]
  --outDir    target directory relative to root                   [default: "."]
  --ext       extension of stylable css files               [default: ".st.css"]
  --log       verbose log                                       [default: false]
  -h, --help  Show help                                                [boolean]
```

By default, `stc` runs on the current working directory, compiling each `.st.css` source file to a `.js` file right next to it.

For example, the file:

`/project/src/components/button/button.st.css`

is compiled into:

`/project/src/components/button/button.st.css.js`.

If your project uses transpilation into an output directory, then `srcDir` and `outDir` parameters should be provided.

A common use case of this utility is running it via an `npm` script in the project's `package.json`:

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

Both a webpack loader and a plugin are exported via special entry points.

The loader, exported via `stylable-integration/webpack-loader`, can be used in a  webpack configuration as follows:

```js

{
    module: {
        rules: [{
            test: /\.st.css$/,
            loader: "stylable-integration/webpack-loader",
            options: { /* transformation options */ }
        }]
    }
}

```

The plugin, exported via `stylable-integration/webpack-plugin`, can be used in a  webpack configuration as follows:

```js
const StylablePlugin = require('stylable-integration/webpack-plugin');

{
    plugins: [
        new StylablePlugin({ /* transformation options */ })
    ]
}

```



## Node.js require hook
