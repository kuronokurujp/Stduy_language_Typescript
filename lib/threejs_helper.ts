/**
 * Threejsを使う上での拡張機能
 * Threejsを使うのでこのパッケージをローカルにインストールしているので
 * Threejsが参照できないな
 * グローバルインストールするかな-
 */

// object型のメンバーの事前宣言なもの
export type TYPE_CAMERA_PARAM = {
    fovy: number;
    aspect: number;
    near: number;
    far: number;
    // Threejsのベクトルにしたいな
    pos_vec3: any;
    lock_at_vec3: any;
};

/**
 * カメラパラメータ作成
 */
export function createCameraParam(): TYPE_CAMERA_PARAM {
    return {
        fovy: 45,
        aspect: window.innerWidth / window.innerHeight,
        near: 0.3,
        far: 10000.0,
        // Threejsのベクトルにしたいな
        pos_vec3: null,
        lock_at_vec3: null,
    };
}

// 平行光源のパラメータ定義
export type TYPE_DIRECTIONAL_LIGHT_PARAM = {
    x: number;
    y: number;
    z: number;
    color: number;
};

/**
 * 平行光源のパラメータ作成
 */
export function createDirectionalLightParam(): TYPE_DIRECTIONAL_LIGHT_PARAM{
    return {
        x: 0.0, y: 0.0, z: 0.0,
        color: 0xffffff
    };
}

// 環境光のパラメータ定義
export type AMBIENT_LIGHT_PARAM  = {
    color: number;
    intensity: number;
};

/**
 * 環境光のパラメータ作成
 */
export function createAmbientLightParam(): AMBIENT_LIGHT_PARAM {
    return {
        color: 0xffffff,
        intensity: 0.5
    };
}

// レンダリングサイズをフルスクリーンサイズに
export function runningResizeRendererForFullScreen(in_renderer: any, in_action: Function) {

    resizeRendererForFullScreen(in_renderer);

    window.addEventListener('resize', () => {
        resizeRendererForFullScreen(in_renderer);
        in_action();
    }, false);
}

export function resizeRendererForFullScreen(in_renderer: any): void {
    in_renderer.setSize(window.innerWidth, window.innerHeight);
}

// フルスクリーンサイズに応じたカメラアスペクト更新
// アスペクト値を返す
export function updateCameraAspectForFullScreen(in_camera: any): number {
    const aspect = window.innerWidth / window.innerHeight;
    in_camera.aspect = aspect;
    in_camera.updateProjectionMatrix();

    return aspect;
}