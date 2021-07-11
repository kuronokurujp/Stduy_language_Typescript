/**
 * WebGLでポリゴン描画
 */
import { gestureStream } from "@thi.ng/rstream-gestures";

/**
 * テキストファイルオブジェクト
 */
class FileTextObject {
    private _text: string = '';
    private _load_promise: Promise<string> | null = null;

    public Text(): string { return this._text; }

    constructor() {}

    Load(in_path: string): Promise<string> {
        // TODO: ロード中で呼ばれた場合の対応が必要かな？
        this._load_promise = new Promise((resolve, reject) => {
            fetch(in_path)
            .then((res: Response) => {
                // ロード成功してテキストとして処理
                return res.text();
            })
            .then((text: string) => {
                // ロード成功して終了
                this._text = text;
                resolve(this._text);

                this._load_promise = null;
            })
            .catch((err: Error) => {
                reject(err);

                this._load_promise = null;
            });
        });

        return this._load_promise;
    }

    UnLoad(): void {}
}

window.addEventListener('DOMContentLoaded', async () => {

    const canvas = <HTMLCanvasElement>document.getElementById('webgl_canvas')!;
    let shader_program : WebGLProgram | null = null;

    const vertex_file = new FileTextObject();
    const fragment_file = new FileTextObject();

    let vbo_buffers : WebGLBuffer[] = new Array();
    let ibo_buffer : WebGLBuffer;
    let indices_count : number = 0;
    let uniform_mouse : WebGLUniformLocation;
    let mouse : number[] = [0, 0];

    // 頂点シェーダファイルをロード
    vertex_file.Load('asset/shaders/vertex.vert')
    .then((vertex_text: string) => {
        // ピクセルシェーダーファイルをロード
        return fragment_file.Load('asset/shaders/fragment.frag');
    })
    .then((fragment_text: string) => {
        console.log('vertex text => ' + vertex_file.Text());
        console.log('fragment text => ' + fragment_file.Text());

        // 頂点シェーダを生成
        let vs : WebGLShader;
        {
            vs = gl.createShader(gl.VERTEX_SHADER)!;
            gl.shaderSource(vs, vertex_file.Text());
            gl.compileShader(vs);
            if (gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
                // 成功
            }
        }

        // フラグメントシェーダを生成
        let fs : WebGLShader;
        {
            fs = gl.createShader(gl.FRAGMENT_SHADER)!;
            gl.shaderSource(fs, fragment_file.Text());
            gl.compileShader(fs);
            if (gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
                // 成功
            }
        }

        // 頂点とフラグメントのシェーダを連結
        {
            shader_program = gl.createProgram()!;
            // 頂点とフラグメントのシェーダを関連付け
            gl.attachShader(shader_program, vs);
            gl.attachShader(shader_program, fs);

            // シェーダオブジェクトをリンク
            gl.linkProgram(shader_program);

            // もう使わないので削除
            gl.deleteShader(vs);
            gl.deleteShader(fs);

            // 問題ないかチェック
            if (gl.getProgramParameter(shader_program, gl.LINK_STATUS)) {
                // 成功
                gl.useProgram(shader_program);
            }
        }

        // 頂点バッファ作成
        {
            const position : number[] = [
                0.0, 0.5, 0.0,
                -0.5, 0.0, 0.0,
                0.5, 0.0, 0.0,
                -0.25, -0.5, 0.0,
                0.25, -0.5, 0.0,
            ];

            {
                const pos_buffer = gl.createBuffer()!;
                gl.bindBuffer(gl.ARRAY_BUFFER, pos_buffer);
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(position), gl.STATIC_DRAW);
                gl.bindBuffer(gl.ARRAY_BUFFER, null);

                vbo_buffers.push(pos_buffer);
            }

            const color : number[] = [
                1.0, 1.0, 1.0, 1.0,
                1.0, 1.0, 1.0, 1.0,
                1.0, 1.0, 1.0, 1.0,
                1.0, 1.0, 1.0, 1.0,
                1.0, 1.0, 1.0, 1.0,
            ];

            {
                const color_buffer = gl.createBuffer()!;
                gl.bindBuffer(gl.ARRAY_BUFFER, color_buffer);
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(color), gl.STATIC_DRAW);
                gl.bindBuffer(gl.ARRAY_BUFFER, null);

                vbo_buffers.push(color_buffer);
            }

            const offset_vec: number[] = [
                (Math.random() * 2 - 1) * 0.5, (Math.random() * 2 - 1) * 0.5, 0.0,
                (Math.random() * 2 - 1) * 0.5, (Math.random() * 2 - 1) * 0.5, 0.0,
                (Math.random() * 2 - 1) * 0.5, (Math.random() * 2 - 1) * 0.5, 0.0,
                (Math.random() * 2 - 1) * 0.5, (Math.random() * 2 - 1) * 0.5, 0.0,
                (Math.random() * 2 - 1) * 0.5, (Math.random() * 2 - 1) * 0.5, 0.0,
            ];

            {
                const offset_vec_buffer = gl.createBuffer()!;
                gl.bindBuffer(gl.ARRAY_BUFFER, offset_vec_buffer);
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(offset_vec), gl.STATIC_DRAW);
                gl.bindBuffer(gl.ARRAY_BUFFER, null);

                vbo_buffers.push(offset_vec_buffer);
            }
        }

        // 頂点インデックスバッファ作成
        {
            const indices = [
                0, 1, 3,
                0, 3, 4,
                0, 2, 4,
            ];
            const ibo = gl.createBuffer()!;
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Int16Array(indices), gl.STATIC_DRAW);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

            indices_count = indices.length;
            ibo_buffer = ibo;
        }

        // 頂点のロケーション作成
        {
            const att_locations : GLint[] = [
                gl.getAttribLocation(shader_program, 'position'),
                gl.getAttribLocation(shader_program, 'color'),
                gl.getAttribLocation(shader_program, 'offset_vec'),
            ];
            const att_stride : number[] = [
                3,
                4,
                3,
            ];

            vbo_buffers.forEach((buffer, index) => {
                gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
                gl.enableVertexAttribArray(att_locations[index]);
                gl.vertexAttribPointer(att_locations[index], att_stride[index], gl.FLOAT, false, 0, 0);
            });
        }

        // シェーダーに渡すプロパティ作成
        {
            uniform_mouse = gl.getUniformLocation(shader_program, 'mouse')!;
        }

        // 作成したGLのオブジェクトを有効化
        {
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo_buffer);
        }

        // 入力系の処理
        {
            let drag_pos : number[] = [0, 0];
            gestureStream(canvas!, {preventDefault: false}).subscribe({
                next: (e) => {
                    switch(e.type) {
                        // タッチ
                        case "start": {
                            drag_pos[0] = e.pos[0] / window.innerWidth * 2.0 - 1.0;
                            drag_pos[1] = e.pos[1] / window.innerHeight * 2.0 - 1.0;

                            break;
                        }
                        // タッチ後の移動
                        case "drag": {
                            const x = e.pos[0] / window.innerWidth * 2.0 - 1.0;
                            const y = e.pos[1] / window.innerHeight * 2.0 - 1.0;

                            mouse[0] = x - drag_pos[0];
                            mouse[1] = y - drag_pos[1];

                            break;
                        }
                        // タッチして離れる
                        case "end": {
                            mouse[0] = mouse[1] = 0;
                            break;
                        }
                    }
                },
            });
        }
    });

    const gl = canvas.getContext('webgl')!;

    // 毎フレーム実行
    const tick = (): void => {
        requestAnimationFrame(tick);

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        gl.viewport(0, 0, window.innerWidth, window.innerHeight);
        gl.clearColor(0.3, 0.3, 0.3, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        if (shader_program == null) {
            return;
        }

        // 描画する
        gl.uniform2fv(uniform_mouse, mouse);
        gl.drawElements(gl.TRIANGLES, indices_count, gl.UNSIGNED_SHORT, 0);
    };
    tick();
}, {passive: false});
