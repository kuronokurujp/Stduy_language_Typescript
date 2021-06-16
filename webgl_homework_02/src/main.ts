/**
 * Threejsを利用したデモ
 * 以下の機能を使って扇風機を使った演出を作成
 * 1. ThreejsのGroup機能を使用してオブジェクトの親子関係を作る(達成)
 * 2. テクスチャロードをしてメッシュに貼り付け(達成)
 * 3. レイキャストを使用してマウスクリックしたメッシュを移動(達成)
 * 4. ポストエフェクトを使用した演出(達成)
 * 5. 自前でメッシュ頂点を作成(達成)
 * 6. Fogを利用して地面と空との境界線をぼかす(達成)
 * 7. 影を入れてみよう(達成)
 * 8. 指定した領域内に特定キューブが入ると浮く(達成)
 * 9. クリックしたキューブの色を変える(達成)
 */
// three_d.tsのインポート
import * as THREE from 'three';
// ポストエフェクトのためのtsファイルをインポートする
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { GlitchPass } from 'three/examples/jsm/postprocessing/GlitchPass';

import { OrbitControls } from 'three-orbitcontrols-ts';
import { gestureStream } from "@thi.ng/rstream-gestures";

// このtsファイルからの相対パスで設定ができる
import * as THREE_HELPER from '../../lib/threejs_helper';

// 扇風機の羽のジオメトリ作成
class WingGeometry extends THREE.BufferGeometry {
    constructor() {
        super();

        // 頂点を作る
        let vertices = [];
        vertices.push(-0.4, 0, 0.6);
        vertices.push(0.4, 0, 0.6);
        vertices.push(-0.1, 0, 0);
        vertices.push(0.1, 0, 0);

        // インデックスバッファを作らないと2枚の板が作れない
        let indexs = [];
        indexs.push(0, 1, 2);
        indexs.push(1, 3, 2);
        this.setIndex(indexs);

        const stride = 3;
        const attribute = new THREE.BufferAttribute(new Float32Array(vertices), stride);
        this.setAttribute("position", attribute);
    }
};

// 扇風機の羽のメッシュ
class WingMesh extends THREE.Mesh {
    constructor(geometry: WingGeometry, material: THREE.Material) {
        super(geometry, material);

        this.receiveShadow = true;
        this.castShadow = true;
    }
};

// 扇風機の回転羽のオブジェクト
class WingFanObject extends THREE.Group {

    private _root_mesh: THREE.Mesh;

    constructor(
        wind_geometry: WingGeometry,
        wing_material: THREE.Material,
        root_geometry: THREE.CylinderGeometry,
        root_material: THREE.Material) {

        super();

        // 羽をつけるシリンダー作成
        this._root_mesh = new THREE.Mesh(root_geometry, root_material);
        this._root_mesh.scale.set(0.1, 0.1, 0.1);

        this.add(this._root_mesh);

        // 羽を4つ作成
        for (let i = 0; i < 4; ++i) {
            const wing_mesh = new WingMesh(wind_geometry, wing_material);

            // 回転して配置
            wing_mesh.rotateY(2.0 * 3.14 / 4.0 * i);
            // 位置の調整
            wing_mesh.position.setY(wing_mesh.position.y + root_geometry.parameters.height / 3 * this._root_mesh.scale.y);

            // グループを使って一つの3Dオブジェクトにする
            this.add(wing_mesh);
        }
    }
};

// 扇風機のオブジェクト
class FanObject extends THREE.Group {
    private _wing_fan_object: WingFanObject;
    private _frame_mesh: THREE.Object3D;

    constructor(
        wing_fan_object: WingFanObject,
        frame_gemetry: THREE.CylinderGeometry,
        frame_material: THREE.MeshBasicMaterial) {

        super();

        // 羽のメッシュを生成
        this._wing_fan_object = wing_fan_object;
        this.add(this._wing_fan_object);

        // フレーム生成
        // ワイヤーフレームにする
        frame_material.wireframe = true;
        frame_material.wireframeLinewidth = 1.5;
        frame_material.color = new THREE.Color(0xffffff);

        this._frame_mesh = new THREE.Mesh(frame_gemetry, frame_material);
        const frame_scale_y_value = 0.1;
        const frame_sclae_xz_value = 0.8;
        this._frame_mesh.scale.set(frame_sclae_xz_value, frame_scale_y_value, frame_sclae_xz_value);
        this._frame_mesh.receiveShadow = true;
        this._frame_mesh.castShadow = true;

        this.add(this._frame_mesh);
    }

    // 更新
    update(): void {
        // 羽を回転
        this._wing_fan_object.rotation.y += 0.1;
    }

    // 風の領域に接触しているかどうか
    intersectObjectsFromWindArea(objects: THREE.Object3D[]): THREE.Object3D | null{
        for (let i: number = 0; i < objects.length; ++i) {
            const obj = objects[i];
            if (Math.abs(obj.position.x - this._frame_mesh.position.x) < this._frame_mesh.scale.x) {
                return obj;
            }
        }

        return null;
    }
};

// 羽の箱
class WingBox extends THREE.Mesh {
    public static object_name: string = "wing_object";

    private tmp: THREE.Vector3 = new THREE.Vector3();
    private tmp2: THREE.Vector3 = new THREE.Vector3();
    private invMass: number = 0.0;
    private acc: THREE.Vector3 = new THREE.Vector3();
    private prev_position: THREE.Vector3 = new THREE.Vector3();
    private init_position: THREE.Vector3 = new THREE.Vector3();
    private enable_auto_force: boolean = false;
    private normal_mat: THREE.MeshLambertMaterial;
    private select_mat: THREE.MeshLambertMaterial;

    constructor(
        geo: THREE.BoxGeometry,
        mat: THREE.MeshLambertMaterial,
        select_mat: THREE.MeshLambertMaterial,
        mass: number,
        pos: THREE.Vector3) {
        super(geo, mat);
        this.castShadow = true;
        this.receiveShadow = true;
        this.name = WingBox.object_name;
        this.invMass = 1 / mass;
        this.select_mat = select_mat;
        this.normal_mat = mat;

        this.position.set(pos.x, pos.y, pos.z);
        this.prev_position.set(pos.x, pos.y, pos.z);
        this.init_position.set(pos.x, pos.y, pos.z);
    }

    reset(): void {
        this.material = this.normal_mat;
        this.position.copy(this.init_position);
        this.enableAutoForce(false);
    }

    click(): void {
        this.material = this.select_mat;
    }

    enableAutoForce(flag: boolean): void {
        this.enable_auto_force = flag;
        this.prev_position.set(this.position.x, this.position.y, this.position.z);
    }

    isAutoForce(): boolean {
        return this.enable_auto_force;
    }

    // 力を与える
    addForce(force: THREE.Vector3): void {
        const t = this.tmp2.copy(force);
        // 意図通り
//        console.log("force: y => " + t.y);
//        console.log("invMass: " + this.invMass);
        const new_acc = t.multiplyScalar(this.invMass);

        this.acc.add(new_acc);
//        console.log("acc: y " + this.acc.y);
    }

    // 更新
    update(time_sq: number): void {
        if(this.enable_auto_force === true) {
            //console.log("addForce");
            this.addForce(new THREE.Vector3(0.0, 1.0, 0.0));
        }
        else {
            return;
        }

        const DAMPING = 0.03;
        const DRAG = 1.0 - DAMPING;

        let new_pos: THREE.Vector3 = new THREE.Vector3();
        new_pos.copy(this.tmp.subVectors(this.position, this.prev_position));

        new_pos.multiplyScalar(DRAG).add(this.position);
        const acc_scaler = this.acc.multiplyScalar(time_sq);
        new_pos.add(acc_scaler);

        this.tmp.set(this.prev_position.x, this.prev_position.y, this.prev_position.z);
        this.prev_position.set(this.position.x, this.position.y, this.position.z);
        this.position.set(new_pos.x, new_pos.y, new_pos.z);

        this.acc.set(0.0, 0.0, 0.0);
    }
};

// 初期化パラメータ
type InitParam = {
    ground_texture: THREE.Texture;
};

// アプリデータ
type ApplicationData = {
    click_mesh: THREE.Object3D | null;
    camera_param : THREE_HELPER.TYPE_CAMERA_PARAM;
    directoina_light_param : THREE_HELPER.TYPE_DIRECTIONAL_LIGHT_PARAM;
    ambient_light_param : THREE_HELPER.AMBIENT_LIGHT_PARAM;
    touch_object: THREE.Object3D | null;
    post_effect_glitch_timer: any;
};

/**
 * 初期化
 */
function init(param : InitParam) : void {
    let app_data : ApplicationData = {
        click_mesh: null,
        camera_param: THREE_HELPER.createCameraParam(),
        directoina_light_param: THREE_HELPER.createDirectionalLightParam(),
        ambient_light_param: THREE_HELPER.createAmbientLightParam(),
        touch_object: null,
        post_effect_glitch_timer: null,
    };

    // アンチエイリアスを有効にしてラインのギザギザ間をなくす
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio( window.devicePixelRatio );
    // レンダリングの影マップを有効
    renderer.shadowMap.enabled = true;

    // htmlのタグを取得して、そのタグの下にレンダリング画面を付ける
    const wrapper = document.querySelector('#webgl_canvas');
    wrapper?.appendChild(renderer.domElement);

    // 3Dシーン作成
    const scene = new THREE.Scene();
    scene.background = new THREE.Color( 0xcce0ff );
    scene.fog = new THREE.Fog( 0xcce0ff, 4, 6);

    // カメラパラメータ作成
    let camera_param : THREE_HELPER.TYPE_CAMERA_PARAM = app_data.camera_param;
    {
        camera_param.pos_vec3 = new THREE.Vector3(0, 1.0, 3);
        camera_param.lock_at_vec3 = new THREE.Vector3(camera_param.pos_vec3.x, camera_param.pos_vec3.y, 0);
    }

    // シーンのカメラ作成
    const camera = new THREE.PerspectiveCamera(
        camera_param.fovy,
        camera_param.aspect,
        camera_param.near,
        camera_param.far,
    );
    {
        camera.position.set(
            camera_param.pos_vec3.x,
            camera_param.pos_vec3.y,
            camera_param.pos_vec3.z
            );
        camera.lookAt(camera_param.lock_at_vec3);
        scene.add(camera);
    }

    // 平行光源ライト作成
    let directoina_light_param : THREE_HELPER.TYPE_DIRECTIONAL_LIGHT_PARAM = app_data.directoina_light_param;
    let light : THREE.DirectionalLight;
    {
        directoina_light_param.x = 0.5;
        directoina_light_param.y = 1;
        directoina_light_param.z = 0;

        // このライトには光から影を計算して生成するため
        // ライトの位置と方向に従った正射影カメラがついている
        // このカメラを使って影の計算している
        light = new THREE.DirectionalLight(directoina_light_param.color, 1);
        light.position.set(
            directoina_light_param.x,
            directoina_light_param.y,
            directoina_light_param.z);

        light.castShadow = true;

        scene.add(light);
    }

    // 環境ライト作成
    let ambient_light_param : THREE_HELPER.AMBIENT_LIGHT_PARAM = app_data.ambient_light_param;
    const ambient_light = new THREE.AmbientLight(
        ambient_light_param.color,
        ambient_light_param.intensity
    );
    scene.add(ambient_light);

    // 画面のリサイズを走らせる
    {
        THREE_HELPER.runningResizeRendererForFullScreen(
            renderer,
            (): void => {
                camera_param.aspect = THREE_HELPER.updateCameraAspectForFullScreen(camera);
            });
    }

    // シーン内のカメラを制御する
    let camera_controller : any = null;
    /*
    camera_controller = new OrbitControls(camera, renderer.domElement);
    // MEMO: OrbitControlsには標準にカメラズームやカメラ移動の機能があるが、ts/webpackをした事でうまく動かないみたい
    //       回転だけできる
    camera_controller.enableZoom = true;
    camera_controller.zoomSpeed = 1.0;

    camera_controller.enablePan = true;
    */

    // デバッグ用
    {
        /*
        const axes_helper = new THREE.AxesHelper(100.0);
        scene.add(axes_helper);
        */

        /*
        const wing_geometry = new WingGeometry();
        // 両面カリングの設定をする
        const wing_material = new THREE.MeshLambertMaterial({ color: 0x999999 });
        wing_material.side = THREE.DoubleSide;

        // TEST: 羽がちゃんと形成されているか
        const wing_dummy_mesh = new WingMesh(wing_geometry, wing_material);
        scene.add(wing_dummy_mesh);
        */
        // TEST: 扇風機のプロペラがでているか
        /*
        const fan_geometry = new CylinderGeometry(1, 1, 2, 8);
        const fan_material = new MeshBasicMaterial({ color: 0xff0066 });
        const wing_fan_object = new WingFanObject(
            wing_geometry, wing_material,
            fan_geometry, fan_material);

        scene.add(wing_fan_object);
        */
    }

    let wing_fan_object = null;
    {
        const wing_geometry = new WingGeometry();
        // 両面カリングの設定をする
        const wing_material = new THREE.MeshBasicMaterial({ color: 0x999999 });
        wing_material.side = THREE.DoubleSide;

        const wing_fan_geometry = new THREE.CylinderGeometry(1, 1, 2, 8);
        const wing_fan_material = new THREE.MeshLambertMaterial({ color: 0xff0066 });
        wing_fan_object = new WingFanObject(
            wing_geometry, wing_material,
            wing_fan_geometry, wing_fan_material);
    }

    let fan_object : FanObject;
    {
        const frame_geometry = new THREE.CylinderGeometry(1, 1, 2, 20);
        const frame_material = new THREE.MeshLambertMaterial();

        fan_object = new FanObject(
            wing_fan_object,
            frame_geometry,
            frame_material
        );

        scene.add(fan_object);

        // 扇風機をライトのターゲット対象とする
        light.target = fan_object;
    }

    // 地上を一枚の板ポリで表現
    let ground_mesh : THREE.Mesh;
    {
        const geo = new THREE.PlaneGeometry(2000, 2000);
        const mat = new THREE.MeshLambertMaterial({
            color: 0x734229,
        });
        let tex = param.ground_texture;
        // 見栄えが良くなるようにテクスチャ設定をする
        {
            // タイリング設定
            tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
            // 値を大きくしてタイリングの繰り返し数を増やしてきめ細やかにする
            tex.repeat.set(100, 100);
            // ミップマップのぼけた結果を少なくするため設定
            tex.anisotropy = 16;

            tex.encoding = THREE.sRGBEncoding;
        }

        mat.map = param.ground_texture;

        ground_mesh = new THREE.Mesh(geo, mat);
        ground_mesh.rotateX(-3.14 / 2.0);
        ground_mesh.receiveShadow = true;
        scene.add(ground_mesh);
    }

    // クリックして移動できるキューブを配置
    let wing_cubes: WingBox[] = [];
    {
        const scale = 0.2;
        const geo = new THREE.BoxGeometry(1, 1);
        const mat = new THREE.MeshLambertMaterial();
        const click_mat = new THREE.MeshLambertMaterial({'color': 0xff0000});
        const count: number = 5;
        for(let i = 0; i < count; ++i) {
            const x = -0.5;
            const y = 1;

            const box = new WingBox(geo, mat, click_mat, 0.5, new THREE.Vector3(x, y, 0));
            box.scale.set(scale, scale, scale);

            scene.add(box);
            wing_cubes.push(box);
        }
    }

    // ポストエフェクトの設定
    const composer = new EffectComposer(renderer);
    const glitch_pass = new GlitchPass();
    {
        let render_pass = new RenderPass(scene, camera);
        composer.addPass(render_pass);
        composer.addPass(glitch_pass);
        glitch_pass.enabled = false;
    }

    // 更新
    {
        // 毎フレーム更新するようにする
        const tick = (): void => {
            requestAnimationFrame(tick);

            fan_object.update();

            const TIMESTEP: number = 18.0 / 1000.0;
            const TIMESTEP_SQ = TIMESTEP * TIMESTEP;
            let tmp_vec: THREE.Vector3 = new THREE.Vector3();
            wing_cubes.forEach(wing_cube => {
                wing_cube.update(TIMESTEP_SQ);

                // カメラ外かチェック
                tmp_vec.copy(wing_cube.position);
                tmp_vec.project(camera);
                // カメラ外ならリセット
                if ((tmp_vec.x < -2.0) || (2.0 < tmp_vec.x)) {
                    wing_cube.reset();
                }
                else if ((tmp_vec.y < -2.0) || (2.0 < tmp_vec.y)) {
                    wing_cube.reset();
                }
            });

            if (camera_controller != null)
                camera_controller.update();

            //renderer.render(scene, camera);
            composer.render();
        };
        tick();
    }

    // ユーザー入力のイベント
    {
        let raycaster = new THREE.Raycaster();
        if (wrapper != null) {
            // preiventDefaultをfalseにしないとクロームプラウザでモバイルモードにするとエラーが出た
            gestureStream(wrapper, {preventDefault: false}).subscribe({
                next: (e) => {
                    switch(e.type) {
                        // タッチ
                        case "start": {
                            const x = e.pos[0] / window.innerWidth * 2.0 - 1.0;
                            const y = e.pos[1] / window.innerHeight * 2.0 - 1.0;
                            const v = new THREE.Vector2(x, -y);

                            raycaster.setFromCamera(v, camera);

                            // 引数で渡したオブジェクトがクリックされているかチェック
                            const wing_cube_touchs = wing_cubes.filter((wing_cube) => !wing_cube.isAutoForce())
                            const intersects = raycaster.intersectObjects(wing_cube_touchs);
                            if (intersects.length > 0) {
                                // タッチしたオブジェクトで特定対象のオブジェクトのみ操作
                                for (let i: number = 0; i < intersects.length; ++i) {
                                    const hit_object = intersects[i];
                                    if (hit_object.object.name === WingBox.object_name) {
                                        app_data.touch_object = hit_object.object;
                                        (app_data.touch_object as WingBox).click();
                                        break;
                                    }
                                }
                            }

                            break;
                        }
                        // タッチ後の移動
                        case "drag": {
                            if (app_data.touch_object != null) {

                                // マウス位置にクリックしたキューブを張り付ける
                                // 以下のサイトをそのまま参考にした(感謝！)
                                // https://stackoverflow.com/questions/36033879/three-js-object-follows-mouse-position
                                const x = e.pos[0] / window.innerWidth * 2.0 - 1.0;
                                const y = e.pos[1] / window.innerHeight * 2.0 - 1.0;

                                const v = new THREE.Vector3(x, -y, 0.5);

                                v.unproject(camera);
                                const dir = v.sub(camera.position).normalize();
                                const distance = -camera.position.z / dir.z;
                                const pos = camera.position.clone().add(dir.multiplyScalar(distance));

                                app_data.touch_object.position.set(pos.x, pos.y, pos.z);

                            }

                            break;
                        }
                        // タッチして離れる
                        case "end": {
                            if (app_data.touch_object != null) {
                                if (fan_object.intersectObjectsFromWindArea([app_data.touch_object]) != null) {

                                    // 一定時間グリッチを実行
                                    glitch_pass.enabled= true;
                                    glitch_pass.goWild = true;

                                    if (app_data.post_effect_glitch_timer != null && app_data.post_effect_glitch_timer as NodeJS.Timeout)
                                        clearTimeout(app_data.post_effect_glitch_timer);

                                    app_data.post_effect_glitch_timer = setInterval(() => {
                                        glitch_pass.enabled = false;
                                    }, 300);

                                    const wing_box = app_data.touch_object as WingBox;
                                    wing_box.enableAutoForce(true);
                                }
                                else
                                {
                                    const wing_box = app_data.touch_object as WingBox;
                                    wing_box.reset();
                                }
                            }

                            app_data.touch_object = null;
                            break;
                        }
                    }
                },
            });
        }
    }
}

window.addEventListener("DOMContentLoaded", () => {
    //console.log("lets go");

    const loader = new THREE.TextureLoader();
    // これでいける？
    loader.load('./image/ground.jpg', (tex: THREE.Texture) => {

        const init_param : InitParam = {
            ground_texture: tex,
        };

        init(init_param);
    })
}, {passive: false});