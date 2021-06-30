/**
 * Threejsを利用したデモ
 * 1. 太陽と地球と月を表示(達成)
 * 2. 1体問題と使って太陽系のシュミレーション計算を作り動かす(終了)
 *     それっぽくなったので一旦これで良い
 * 3. 太陽にポイントライトを付ける(達成)
 * 4. 地球と月のテクスチャをロード(達成)
 * 5. 地球と月のテクスチャを張り付ける(達成)
 * 6. 太陽と地球と月の大きさを決めて設定(終了)
 *     太陽の大きさを基準にして他の惑星のスケールを決める
 *     現在と同じ大きさの比率にすると地球や月が画面上に見えなくなるのでいい感じの大きさにした
 * 7. 背景に宇宙空間の表現を出す(終了)
*      https://github.com/mrdoob/three.js/blob/master/examples/misc_controls_fly.html
 * 8. lensflareを使って太陽の光を出す(中止)
 *     検証して使ってみたが、
 *     今回の目的用途に合わなかったのでやめた
 * 9. 太陽のエフェクト作成(終了)
 *      カスタムシェーダーについて調査が必要
 */

// three_d.tsのインポート
import * as THREE from 'three';

import * as WEBPACK_HELPER from '../../lib/webpack_helper';
// このtsファイルからの相対パスで設定ができる
import * as THREE_HELPER from '../../lib/threejs_helper';

// デバッグ用
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GUI } from 'three/examples/jsm/libs/dat.gui.module';

/**
 * フレアクラス
 */
class Flare extends THREE.Object3D {
    private _geometry: THREE.CylinderGeometry;
    private _map: THREE.Texture;
    private _material: THREE.ShaderMaterial;
    private _mesh: THREE.Mesh;
    private _speed: number;
    private _offset: THREE.Vector2 = new THREE.Vector2();
    private _top_radius: number = 0;
    private _bottom_radius: number = 0;
    private _diameter: number = 0;
    private _random_ratio: number = Math.random() + 1;

    constructor(texture: THREE.Texture) {
        super();

        this._speed = Math.random() * 0.05 + 0.01;

        this._top_radius = 6;
        this._bottom_radius = 2;
        this._diameter = this._top_radius - this._bottom_radius;

        this._geometry = new THREE.CylinderGeometry(this._top_radius, this._bottom_radius, 0, 30, 3, true);
        this._map = texture.clone();
        this._map.needsUpdate = true;
        this._map.wrapS = this._map.wrapT = THREE.RepeatWrapping;
        this._map.repeat.set(10, 10);

        this._material = this._createMaterial();

        this._mesh =  new THREE.Mesh(
            this._geometry,
            this._material
        );
        this.add(this._mesh);
    }

    private _createMaterial() : THREE.ShaderMaterial {
        let material = new THREE.ShaderMaterial({
            uniforms: {
                map: {
                    value: this._map
                },
                offset: {
                    value: this._offset
                },
                opacity: {
                    value: 0.15
                },
                innerRadius: {
                    value: this._bottom_radius
                },
                diameter: {
                    value: this._diameter
                }
            },
            vertexShader:`
                varying vec2 vUv;
                varying float radius;
                uniform vec2 offset;

                void main()
                {
                    vUv = uv + offset;
                    radius = length(position);
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
                `,
            fragmentShader:`
                uniform sampler2D map;
                uniform float opacity;
                uniform float diameter;
                uniform float innerRadius;
                varying vec2 vUv;
                varying float radius;
                const float PI = 3.145926;

                void main() {
                    vec4 tColor = texture2D(map, vUv);
                    float ratio = (radius - innerRadius) / diameter;
                    float opacity = opacity * sin(PI * ratio);
                    vec4 baseColor = (tColor + vec4(0.0, 0.0, 0.3, 1.0));

                    gl_FragColor = baseColor * vec4(1.0, 0.0, 0.0, opacity);
                }
            `,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            depthTest: false,
            transparent: true
        });
        return material;
    }

    public update(offset_ratio: THREE.Vector2) {
        this._offset.x += offset_ratio.x * this._random_ratio;
        this._offset.y -= offset_ratio.y * this._random_ratio;
    }
};

/**
 * 太陽モデル
 */
class SunModel extends THREE.Object3D {

    private _magma_texture: THREE.Texture;

    private _sun_mesh: THREE.Mesh;
    private _flare_objects: Flare[] = [];

    constructor(magma_texture: THREE.Texture, aura_texture: THREE.Texture) {
        super();

        this._magma_texture = new THREE.Texture();
        this._magma_texture.copy(magma_texture);
        // テクスチャをコピーした時にコピー先に以下のフラグがtrueになっていないとテクスチャの更新が走らずにメッシュに張り付けてもテクスチャが反映しない
        // どうもloadして作成したテクスチャクラスにはload完了後にneedsUpdateフラグがtrueに設定されているみたい
        // 参考サイト
        // https://stackoverflow.com/questions/54115592/how-to-use-texture-clone-in-three-js
        this._magma_texture.needsUpdate = true;
        // テクスチャをリピート設定
        this._magma_texture.wrapS = this._magma_texture.wrapT = THREE.RepeatWrapping;

        this._sun_mesh = new THREE.Mesh(
            new THREE.SphereBufferGeometry(1, 100, 100),
            new THREE.MeshBasicMaterial({map: this._magma_texture}));

        this.add(this._sun_mesh);

        // test
        {
            for (let i = 0; i < 30; ++i) {
                const flare_object = new Flare(aura_texture);
                flare_object.rotation.z += Math.random() * i;
                flare_object.rotation.x += Math.random() * i;
                flare_object.rotation.y += Math.random() * i;

                this._flare_objects.push(flare_object);
                flare_object.scale.setScalar(0.5);
                this.add(flare_object);
            }
        }
    }

    public update() {
        // 太陽のメッシュに張り付けたマグマテクスチャをUVスクロールさせてアニメさせる
        // UVアニメ！
        {
            const offset_ratio = new THREE.Vector2(0.1, 0.1);
            this._magma_texture!.offset.x += 0.005 * offset_ratio.x;
            this._magma_texture!.offset.y += 0.005 * offset_ratio.y;
        }

        {
            const offset_ratio = new THREE.Vector2(0.0004, 0.0015);
            this._flare_objects.forEach((flare_object) => {
                flare_object.update(offset_ratio);
            });
        }
    }
}

/**
 * デモを表示するレンダラー
 */
class DemoRenderer {
    _renderer: THREE.WebGLRenderer | null = null;
    _scene: THREE.Scene | null = null;
    _camera: THREE.PerspectiveCamera | null = null;
    _camera_param: THREE_HELPER.TYPE_CAMERA_PARAM | null = null;
    _sun_model: SunModel | null = null;
    _earth_object: THREE.Object3D | null = null;
    _monn_object: THREE.Object3D | null = null;

    _earth_texture: THREE.Texture | null = null;
    _moon_texture: THREE.Texture | null = null;
    _magma_texture: THREE.Texture | null = null;
    _aura_texture: THREE.Texture | null = null;

    _sun_light: THREE.PointLight | null = null;
    _ambient_light: THREE.AmbientLight | null = null;

    _sun_to_earth_vec: THREE.Vector3 = new THREE.Vector3(0, 0, 10.0);

    _earth_vec: THREE.Vector3 = new THREE.Vector3(0.1, 0, 0.0);
    _earth_group: THREE.Group | null = null;
    _sun_to_earth_length: number = 0;

    constructor() {}

    async build(root_element: Element | null): Promise<void> {
        const loader = new THREE.TextureLoader();
        // 非同期のロード
        await Promise.all([
            loader.loadAsync('./images/earth.jpg'), 
            loader.loadAsync('./images/moon.jpg'),
            loader.loadAsync('./images/magma.png'),
            loader.loadAsync('./images/aura3_type2.png'),
        ]).then((textures) => {
            this._earth_texture = textures[0];
            this._moon_texture = textures[1];
            this._magma_texture = textures[2];
            this._aura_texture = textures[3];

            this._build(root_element);
        });
    }

    renderer(dt: number): void {
        if (this._renderer === null)
            return;

        if (this._scene === null)
            return;

        if (this._camera === null)
            return;

        if (this._earth_group !== null) {
            const r = this._sun_to_earth_length;

            const a = 0.5 * 0.2 / r / r;
            const c = this._earth_group!.position.x / r;
            const s = this._earth_group!.position.y / r;
            const b = this._earth_group!.position.z / r;

            this._earth_vec.x = this._earth_vec.x - a * c * dt;
            this._earth_vec.y = this._earth_vec.y - a * s * dt;
            this._earth_vec.z = this._earth_vec.z - a * b * dt;

            let tmp_vec = this._earth_vec.clone();
            tmp_vec.multiplyScalar(dt);

            this._earth_group!.position.add(tmp_vec);
            this._earth_group.rotation.y += tmp_vec.length() * 0.1;
        }

        this._sun_model?.update();

        // 描画
        this._renderer.render(this._scene, this._camera);
    }

    private _build(root_element: Element | null): void
    {
        // レンダラー作成
        this._renderer = new THREE.WebGLRenderer({alpha: true});
        this._renderer.setPixelRatio(window.devicePixelRatio);

        root_element?.appendChild(this._renderer.domElement);

        // 3Dシーン作成
        this._scene = new THREE.Scene();
        this._scene.background = new THREE.Color(0x000000);

        // 環境光
        {
            this._ambient_light = new THREE.AmbientLight(0xffffff);
            this._scene.add(this._ambient_light);
        }

        // シーンのカメラ作成
        {
            this._camera_param = THREE_HELPER.createCameraDefaultParam();
            {
                this._camera_param.pos_vec3 = new THREE.Vector3(0, 1.0, 3);
                this._camera_param.lock_at_vec3 = new THREE.Vector3(0, 0, 0);
            }

            this._camera = new THREE.PerspectiveCamera(
                this._camera_param.fovy,
                this._camera_param.aspect,
                this._camera_param.near,
                this._camera_param.far,
            );

            this._camera.position.set(
                -23.101457008358526,
                7.172118303334682,
                10.823659102688088,
            );

            this._camera.rotation.x = -0.585205159238454;
            this._camera.rotation.y = -1.0587461052589124;
            this._camera.rotation.z = -0.5238199877873856;

            this._camera.lookAt(this._camera_param.lock_at_vec3);
            this._scene.add(this._camera);
        }

        // TODO: 太陽オブジェクト作成
        const sun_scale = 2.0;
        {
            this._sun_model = new SunModel(this._magma_texture!, this._aura_texture!);
            this._sun_model.scale.multiplyScalar(sun_scale);
            this._scene.add(this._sun_model);

            this._sun_light = new THREE.PointLight(0xffffff, 10, 10);

            this._scene.add(this._sun_light);
            if (WEBPACK_HELPER.IsDev())
                this._scene.add(new THREE.PointLightHelper(this._sun_light, 15));
        }

        // TODO: 地球オブジェクト作成
        const earth_scale = 0.5;
        {
            this._earth_group = new THREE.Group();
            this._earth_object = new THREE.Mesh(
                new THREE.SphereBufferGeometry(1, 100, 100), 
                new THREE.MeshLambertMaterial({map: this._earth_texture}));
            this._earth_object.scale.multiplyScalar(earth_scale);
            
            this._earth_group.add(this._earth_object);

            let earth_position: THREE.Vector3 = new THREE.Vector3();
            this._sun_model.position.copy(earth_position);

            this._earth_group.position.copy(earth_position.add(this._sun_to_earth_vec));
        }

        // TODO: 月オブジェクト作成
        const moon_scale = earth_scale / 2.0;
        {
            this._monn_object= new THREE.Mesh(
                new THREE.SphereBufferGeometry(1, 100, 100), 
                new THREE.MeshLambertMaterial({map: this._moon_texture}));
            this._monn_object.scale.multiplyScalar(moon_scale);
            
            this._monn_object.position.set(0, 0, 1);
            this._earth_group.add(this._monn_object);
        }
        this._scene.add(this._earth_group);

        // 宇宙空間の星を表示
        {
            const r = 1;
            const stars_geometry = [new THREE.BufferGeometry(), new THREE.BufferGeometry() ];

            const vertices1 = [];
            const vertices2 = [];

            const vertex = new THREE.Vector3();

            for (let i = 0; i < 250; ++i) {
                vertex.x = Math.random() * 2 - 1;
                vertex.y = Math.random() * 2 - 1;
                vertex.z = Math.random() * 2 - 1;
                vertex.multiplyScalar(r);

                vertices1.push(vertex.x, vertex.y, vertex.z);
            }

            for (let i = 0; i < 1500; ++i) {
                vertex.x = Math.random() * 2 - 1;
                vertex.y = Math.random() * 2 - 1;
                vertex.z = Math.random() * 2 - 1;
                vertex.multiplyScalar(r);

                vertices2.push(vertex.x, vertex.y, vertex.z);
            }

            stars_geometry[0].setAttribute('position', new THREE.Float32BufferAttribute(vertices1, 3));
            stars_geometry[1].setAttribute('position', new THREE.Float32BufferAttribute(vertices2, 3));

            const start_materials = [
                new THREE.PointsMaterial({color: 0x555555, size: 2, sizeAttenuation: false}),
                new THREE.PointsMaterial({color: 0x555555, size: 1, sizeAttenuation: false}),
                new THREE.PointsMaterial({color: 0x333333, size: 2, sizeAttenuation: false}),
                new THREE.PointsMaterial({color: 0x3a3a3a, size: 1, sizeAttenuation: false}),
                new THREE.PointsMaterial({color: 0x1a1a1a, size: 2, sizeAttenuation: false}),
                new THREE.PointsMaterial({color: 0x1a1a1a, size: 1, sizeAttenuation: false})
            ];

            for (let i = 10; i < 30; ++i) {
                const stars = new THREE.Points(stars_geometry[i % 2], start_materials[ i % start_materials.length] );
                stars.position.x = Math.random() * 6;
                stars.position.y = Math.random() * 6;
                stars.position.z = Math.random() * 6;
                stars.scale.setScalar(i * 10);

                stars.matrixAutoUpdate = false;
                stars.updateMatrix();

                this._scene.add(stars);
            }
        }

        {
            let tmp_earth_pos: THREE.Vector3 = this._earth_group!.position.clone();
            let sun_to_earth_pos = tmp_earth_pos.sub(this._sun_model!.position);
            this._sun_to_earth_length = sun_to_earth_pos.length();
        }

        // 画面のフルスクリーンのリサイズ
        THREE_HELPER.runningResizeRendererForFullScreen(this._renderer, (): void => {
            THREE_HELPER.updateCameraAspectForFullScreen(this._camera);
        })
    }

    public DebugCameraPrint() {
        console.log('------ cam param -------');
        console.log(this._camera?.position);
        console.log(this._camera?.rotation);
        console.log(this._camera?.fov);
        console.log('-------------');
    }
};

window.addEventListener('DOMContentLoaded', async () => {
    // HTMLドキュメントが読み込まれて解析が終わったら呼ばれる
    // 注意点として画像などのデータロードはまだ終わっていない

    const element_canvas = document.querySelector('#webgl_canvas');
    let demo_renderer = new DemoRenderer();
    await demo_renderer.build(element_canvas);

    // シーン内のカメラを制御する
    let camera_controller: OrbitControls | null = null;
    if (WEBPACK_HELPER.IsDev() && demo_renderer._camera && demo_renderer._renderer) {
        camera_controller = new OrbitControls(demo_renderer._camera, demo_renderer._renderer.domElement);

        camera_controller.enableZoom = true;
        camera_controller.zoomSpeed = 1.0;
        camera_controller.minZoom = 100;
        camera_controller.minDistance = 10;

        camera_controller.enablePan = true;

        // 座標軸を表示
        const axes_helper = new THREE.AxesHelper(100.0);
        demo_renderer._scene?.add(axes_helper);

        // GUI
        const gui = new GUI();
        if (demo_renderer._sun_light) {
            const sun_light_folder = gui.addFolder('SunLight');
            sun_light_folder.add(demo_renderer._sun_light, 'intensity', false).name('intensity');
            sun_light_folder.add(demo_renderer._sun_light, 'distance', false).name('distance');

            sun_light_folder.open();
        }

        if (demo_renderer._ambient_light) {
            const ambient_light_folder = gui.addFolder('AmbientLight');
            ambient_light_folder.add(demo_renderer._ambient_light, 'intensity', false).name('intensity');

            ambient_light_folder.open();
        }

        if (demo_renderer._camera)
        {
            const camera_folder = gui.addFolder('camera_param');
            camera_folder.add(demo_renderer, 'DebugCameraPrint').name('DebugCameraPrint');
            
            camera_folder.open();
        }
    }

    const tick = (): void => {
        requestAnimationFrame(tick);

        camera_controller?.update();

        demo_renderer.renderer(1.0);
    };
    tick();

}, {passive: false});

