/**
 * Webpackを利用した時によく使う機能をまとめたファイル
 */

// webpack.configで定義した環境定義
declare var ENV_MODE: string;
export function IsDev(): boolean {
    return (ENV_MODE === 'development');
}
