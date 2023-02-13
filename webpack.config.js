const path = require('path');
const NodemonPlugin = require('nodemon-webpack-plugin');

module.exports = {
    entry: {
        "main":'./typescript/main-server.ts',
        "update-worker":'./typescript/modules/worker/update-worker.ts',
        "reports-worker":'./typescript/modules/worker/reports-worker.ts',
    },
    devtool: 'inline-source-map',
    mode: 'development',
    watchOptions: {
        poll: true,
        ignored: /node_modules/
    },
    plugins: [
        new NodemonPlugin(),
    ],
    module: {
        rules: [
            {
                test: /\.ts?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            }
        ],
    },
    externals: [
        {'sharp': 'commonjs sharp',},
        { 'express': 'commonjs express' },
        {'mongodb': 'commonjs mongodb',},
        'mongodb-client-encryption',
        'aws4',
        'aws-crt',
        'saslprep',
        'kerberos',
        'snappy',
        'bson-ext',
        '@mongodb-js/zstd',
    ],
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
    },
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'dist'),
        publicPath: '',
    },
    target: 'node',
};