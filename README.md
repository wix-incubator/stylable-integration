# Stylable Integration
[![Build Status](https://travis-ci.com/wixplosives/stylable-integration.svg?token=JxepjChyzQB66ehAYhtG&branch=master)](https://travis-ci.com/wixplosives/stylable-integration)

Contains:
- A webpack loader for stylable css (stylable-integration/webpack)
- CLI to build for publishing (WIP)


# How to use this thing.

```bash
npm install stylable-integration --save-dev
```

Add the loader to your webpack config.

```js

{
    loaders: [
        {
            test: /\.css$/,
            loader: "stylable-integration/webpack",
            options: { standalone: true }
        }
    ]
}

```
