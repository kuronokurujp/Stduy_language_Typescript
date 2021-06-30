
const webpack = require("webpack");

var config = {
   // 出力するモードを
    mode: "development",

    // js実行時に最初に実行されるエントリーポイント
    entry: "./src/main.ts",
    // ファイルの出力設定
    output: {
        // jsの出力先
        path: `${__dirname}/dist`,
        // packされた出力ファイル名
        filename: "main.js"
    },
    module: {
        rules: [
            {
                // 拡張子.tsの場合
                // 正規表現を使っている
                test: /\.ts$/,
                // tsファイルがあればTypeScriptでコンパイル
                use: "ts-loader"
            }
        ]
    },
    // import分で.tsファイルを解決する
    resolve: {
        extensions: [".ts", ".js"]
    },

    plugins: []
};

module.exports = (env, argv) => {
    var mode = config.mode;
    if (argv.mode !== undefined) {
        mode = argv.mode;
    }

    config.plugins = [
        new webpack.DefinePlugin({
            ENV_MODE: JSON.stringify(mode)
        })
    ];

    return config;
};

/*
module.exports = {
    // 出力するモードを
    mode: "development",

    // js実行時に最初に実行されるエントリーポイント
    entry: "./src/main.ts",
    // ファイルの出力設定
    output: {
        // jsの出力先
        path: `${__dirname}/dist`,
        // packされた出力ファイル名
        filename: "main.js"
    },
    module: {
        rules: [
            {
                // 拡張子.tsの場合
                // 正規表現を使っている
                test: /\.ts$/,
                // tsファイルがあればTypeScriptでコンパイル
                use: "ts-loader"
            }
        ]
    },
    // import分で.tsファイルを解決する
    resolve: {
        extensions: [".ts", ".js"]
    },

    plugins: [
        new webpack.DefinePlugin({
            TEST_KEY: JSON.stringify(mode)
        })
    ]
}
*/