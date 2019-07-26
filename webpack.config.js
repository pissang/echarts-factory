module.exports = {
    entry: './src/main.ts',
    output: {
        filename: 'bundle.js',
        path: __dirname + '/dist'
    },

    // Enable sourcemaps for debugging webpack's output.
    devtool: 'source-map',
    resolve: {
        // Add '.ts' and '.tsx' as resolvable extensions.
        extensions: ['.ts', '.tsx', '.js', '.json']
    },

    module: {
        rules: [
            // All files with a '.ts' or '.tsx' extension will be handled by 'awesome-typescript-loader'.
            { test: /\.tsx?$/, loader: 'ts-loader', exclude: /node_modules/ }
        ]
    },
};