/**
    Threejsを使用した3Dデモ
    竜巻を３Dデモとして表現してみた
 */

/**
    気になった点
        プラウザ画面がスクロールする
        デバッグとリリース版で切り替えたい
 */

/**
    どうする？
        yの最大値を調整
        外部調整用のGUIが欲しいな
        右クリックした状態でマウスを動かすとXZの中間点が動く
 */

// Threejsのインポート
import * as THREE from 'three';
import { OrbitControls } from 'three-orbitcontrols-ts';

/**
 * カメラパラメータ
 */
let CAMERA_PARAM = {
    fovy: 45,
    aspect: window.innerWidth / window.innerHeight,
    near: 0.3,
    far: 10000.0,
    x: 0.0,
    y: 1.0,
    z: 1.0,
    lock_at: new THREE.Vector3(0.0, 0.0, 0.0),
};

/**
 * ライトパラメータ
 */
const LIGHT_PARAM = {
    color: 0xffffff,
    pos: new THREE.Vector3(0.0, 1.0, 0.0),
};

/**
 * 環境ライトパラメータ
 */
const AMBIENT_LIGHT_PARAM = {
    color: 0xffffff,
    intensity: 0.2,
};

// 竜巻の粒子
class TornadoParaticle {

    private _now_radius: number = 0.0;

    public get_time(): number {
        return this._time;
    }

    constructor(
        // ３Dメッシュ
        private _obj: THREE.Object3D,
        // 円周期の角度
        private _radian: number,
        // 円周期移動の速度
        private _speed: number,
        // 円の中心から半径
        private _radius: number,
        private _time: number,
        ) {
            this._now_radius = this._radius;
    }

    update(
        in_delta_time: number,
        in_realtive_position: THREE.Vector3): void {

        // TODO: 角度が2piを超えた時の対処が必要
        const pi = 2 * 3.14;
        {
            this._obj.rotation.x += 0.05;
            this._obj.rotation.x = this._obj.rotation.x >= pi ? this._obj.rotation.x - pi : this._obj.rotation.x;

            this._obj.rotation.y += 0.05;
            this._obj.rotation.y = this._obj.rotation.y >= pi ? this._obj.rotation.x - pi : this._obj.rotation.x;
        }

        // 回転移動する
        {
            this._radian += this._speed;
            this._radian = this._radian >= pi ? this._radian - pi : this._radian;

            this._radius += in_delta_time;

            // 円周期に位置を設定
            this._obj.position.set(
                Math.cos(this._radian) * this._radius,
                0.0,
                Math.sin(this._radian) * this._radius,
            );

            // 相対位置を加算
            this._obj.position.add(in_realtive_position);
        }

        this._time += in_delta_time;
        if (this._time >= 1.0) {
            this._time = this._time - 1.0;
            this._radius = this._now_radius;
        }
    }
};

// 竜巻エフェクト
class ToranadoEffect {
    private _meshs: TornadoParaticle[];
    private _last_effect_relative_position: THREE.Vector3;
    private _line: THREE.QuadraticBezierCurve3;
    private _line_point: THREE.Vector3;

    constructor(
        in_scene: THREE.Scene,
        in_geo: THREE.BufferGeometry,
        in_mat: THREE.Material,
        private _center_pos: THREE.Vector3,
        private _paraticle_num: number,
        ) {

        // 粒子群を作成
        {
            // 配列初期化
            this._meshs = [];
            for (let index = 0; index < this._paraticle_num; index++) {
                const mesh = new THREE.Mesh(in_geo, in_mat);
                // メッシュの大きさを調整
                const mesh_scale = 0.0025 * Math.random() + 0.01;
                mesh.scale.set(mesh_scale, mesh_scale, mesh_scale);

                in_scene.add(mesh);

                const effect =  new TornadoParaticle(
                    mesh,
                    // 円移動する時の最初の角度
                    Math.random() * 2.0 * 3.14,
                    // 円移動の速度
                    Math.random() * 0.2,
                    // 円の中心からの半径
                    // 中心位置に配置しないようにしている
                    (Math.random() * 0.1) + 0.01,
                    // TODO: ランダムにして開始点を変える
                    Math.random(),
                    );
                this._meshs.push(effect);
            }
        }

        // 移動パス作成
        {
            this._last_effect_relative_position = new THREE.Vector3(0, 1.0, 0);
            // 曲線パスを作成
            this._line_point = new THREE.Vector3(-0.5, 0.2, 0);
            this._line = new THREE.QuadraticBezierCurve3(
                new THREE.Vector3(0, 0, 0),
                this._line_point,
                this._last_effect_relative_position
            );
        }
    }

    /**
     * 更新
     */
    update(): void {

        // 粒子の竜巻
        this._meshs.forEach(mesh=> {
            const relative_position = this._line.getPointAt(mesh.get_time());
            mesh.update(0.01 * Math.random(), relative_position);
        });
    }
};

// レンダリングサイズをフルスクリーンサイズに
function ResizeRendererForFullScreen(in_renderer: THREE.WebGLRenderer): void {
    in_renderer.setSize(window.innerWidth, window.innerHeight);
}

// フルスクリーンサイズに応じたカメラアスペクト更新
function UpdateCameraAspectForFullScreen(in_camera: THREE.PerspectiveCamera): void {
    CAMERA_PARAM.aspect = window.innerWidth / window.innerHeight;
    in_camera.aspect = CAMERA_PARAM.aspect;
    in_camera.updateProjectionMatrix();
}

window.addEventListener("DOMContentLoaded", () => {
    console.log("lets go!");

    let renderer = new THREE.WebGLRenderer();

    // htmlのタグを取得して、そのタグの下にレンダリング画面を付ける
    const wrapper = document.querySelector('#webgl_canvas');
    wrapper?.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    // カメラ構築
    const camera = new THREE.PerspectiveCamera(
        CAMERA_PARAM.fovy,
        CAMERA_PARAM.aspect,
        CAMERA_PARAM.near,
        CAMERA_PARAM.far
    );
    {
        camera.position.set(
            CAMERA_PARAM.x,
            CAMERA_PARAM.y,
            CAMERA_PARAM.z
        );
        camera.lookAt(CAMERA_PARAM.lock_at);
    }
    scene.add(camera);

    // ライト設定
    const light = new THREE.DirectionalLight(LIGHT_PARAM.color);
    {
        light.position.set(LIGHT_PARAM.pos.x, LIGHT_PARAM.pos.y, LIGHT_PARAM.pos.z);
        scene.add(light);
    }

    // 環境ライト設定
    const ambient_light = new THREE.AmbientLight(
        AMBIENT_LIGHT_PARAM.color,
        AMBIENT_LIGHT_PARAM.intensity
    );
    scene.add(ambient_light);

    // 画面のリサイズ
    {
        ResizeRendererForFullScreen(renderer);
        window.addEventListener('resize', () => {
            ResizeRendererForFullScreen(renderer);
            UpdateCameraAspectForFullScreen(camera);
        }, false);
    }

    /*
    // デバッグ用
    {
        const axes_helper = new THREE.AxesHelper(100.0);
        scene.add(axes_helper);
    }
    */

    // シーンのカメラ制御のインスタンスを生成
    const controls = new OrbitControls(camera, renderer.domElement);

    // 竜巻エフェクト作成
    const effect = new ToranadoEffect(
        scene,
        new THREE.BoxBufferGeometry(),
        new THREE.MeshToonMaterial(),
        new THREE.Vector3(0, 0, 0),
        500,
    );

    // 更新
    {
        const tick = (): void => {
            requestAnimationFrame(tick);

            effect.update();

            renderer.render(scene, camera);
        };
        tick();
    }
});