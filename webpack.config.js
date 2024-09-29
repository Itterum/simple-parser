const path = require('path');
const fs = require('fs');

function getExtractorsEntries(dirPath, basePath = './extractors') {
    let entries = {};
    const files = fs.readdirSync(dirPath);
    files.forEach(file => {
        const fullPath = path.join(dirPath, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            Object.assign(entries, getExtractorsEntries(fullPath, path.join(basePath, file)));
        } else if (file.endsWith('.ts')) {
            const entryName = path.join(basePath, path.basename(file, '.ts'));
            entries[entryName] = `./${path.join(basePath, file)}`;
        }
    });
    return entries;
}

const extractorsEntries = getExtractorsEntries(path.resolve(__dirname, './extractors'));

module.exports = {
    entry: {
        main: './src/index.ts',
        ...extractorsEntries,
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        extensions: ['.ts', '.js'],
    },
    output: {
        filename: '[name].bundle.js',
        path: path.resolve(__dirname, 'dist'),
    },
    target: 'node',
    externals: {
        fs: 'commonjs fs',
        path: 'commonjs path',
        playwright: 'commonjs playwright',
    },
};
