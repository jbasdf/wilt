module.exports = {
    entry: "./src/js/one.js",
    output: {
        path: __dirname,
        filename: "bundle.js"
    },
    module: {
        loaders: [
            { test: /\.scss$/, loader: "style-loader!css-loader!sass" },
            { test: /\.jsx?$/,   loader: 'jsx-loader?harmony&stripTypes' }
        ]
    }
};