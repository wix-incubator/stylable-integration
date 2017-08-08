module.exports = {
    Plugin:require('./dist/src/webpack-loader').Plugin,
    Resolver:require('./dist/src/fs-resolver').FSResolver,
    loader:require('./dist/src/webpack-loader').loader
};
