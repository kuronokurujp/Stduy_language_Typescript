# A repository for typescript learning.

## Purpose
. To increase the productivity of 3D graphics development using WebGL

WebGLを使った3Dグラフィックス開発の生産性を上げるため

## About repository configuration(このリポジトリの構成について)
このリポジトリにtypescriptで作成したプロジェクトをまとめます。

<a href="https://qiita.com/kohashi/items/88d39e2c8bb569d66524">モノレポ</a>運用を試してみます。

## Memo

- <font size=4>threejsのguiを使いたい</font>

	threejsのサンプルを見るとプラウザ画面にパラメータ調整のGUIがある

	これをどうやれば使えるのか調査した

	npmで@types/threeのパッケージをインストールしてもguiを参照するtsファイルは存在しない

	なので実装しているパッケージをインストールするか、自前で作るしかない

	探したらパッケージがあった

	https://sbcode.net/threejs/dat-gui/

		npm i @types/dat.gui

	これでインストール出来た

	しかしこのままでは使えない

	インストールしたパッケージのindex.d.tsファイルをコピーして移動すれば使えるようになった

	移動Pathは

		@types/three/esamples/jsm/libs

	ここに移動すると使える

