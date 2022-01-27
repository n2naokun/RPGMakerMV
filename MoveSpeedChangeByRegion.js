//=============================================================================
// MoveSpeedChangeByRegion.js
// ----------------------------------------------------------------------------
// (C)2018 Triacontane
// This software is released under the MIT License.
// http://opensource.org/licenses/mit-license.php
// ----------------------------------------------------------------------------
// Version
// 1.3.1 2022/01/27 ヘルプの記述を修正
// 1.3.0 2022/01/27 MZで動作するよう修正
// 1.2.0 2021/11/21 1.1.0のメモ欄の指定方法変更
// 1.1.0 2021/11/21 メモタグからも地形、リージョンによる速度変更ができる機能を追加
// 1.0.1 2018/02/15 フォロワーを連れているときにフォロワーの移動速度がおかしくなる問題を修正
// 1.0.0 2018/02/12 初版
// ----------------------------------------------------------------------------
// [Blog]   : https://triacontane.blogspot.jp/
// [Twitter]: https://twitter.com/triacontane/
// [GitHub] : https://github.com/triacontane/
//=============================================================================

/*:
 * @plugindesc 地形による速度変化プラグイン
 * @target MZ
 * @url https://github.com/triacontane/RPGMakerMV/tree/mz_master/MoveSpeedChangeByRegion.js
 * @base PluginCommonBase
 * @orderAfter PluginCommonBase
 * @author トリアコンタン
 *
 * @param slowlyTerrainTags
 * @text 速度低下地形
 * @desc 移動中に速度が低下する地形タグです。複数指定できます。
 * @default
 * @type number[]
 *
 * @param fasterTerrainTags
 * @text 速度上昇地形
 * @desc 移動中に速度が上昇する地形タグです。複数指定できます。
 * @default
 * @type number[]
 *
 * @param slowlyRegions
 * @text 速度低下リージョン
 * @desc 移動中に速度が低下するリージョンです。複数指定できます。
 * @default
 * @type number[]
 *
 * @param fasterRegions
 * @text 速度上昇リージョン
 * @desc 移動中に速度が上昇するリージョンです。複数指定できます。
 * @default
 * @type number[]
 *
 * @param deltaSpeed
 * @text 速度変化量
 * @desc 速度が上昇、低下するときの変化量です。
 * @default 1
 * @type number
 *
 * @help MoveSpeedChangeByRegion.js
 *
 * 指定した地形もしくはリージョンに乗っている間だけキャラクターの移動速度を
 * 自動的に上昇もしくは低下させます。
 * パラメータから対象地形とリージョンを指定します。
 *
 * さらに、隊列にいるいずれかのメンバーが以下のメモタグを付与されている(※)
 * 場合、パラメータより優先して速度が適用されます。
 * ・地形タグ[1]のとき速度が[4]になる
 * <速度地形指定:1,4>
 * ※アクター、職業、武器、防具、ステートのメモ欄が対象です。
 *
 * 現在の速度から相対的に指定する場合は[+][-]の記号を付けてください。
 * ・リージョン[1]のとき速度が[2]段階あがる
 * <速度リージョン指定:1,+2>
 *
 * このプラグインにはプラグインコマンドはありません。
 *
 * 利用規約：
 *  作者に無断で改変、再配布が可能で、利用形態（商用、18禁利用等）
 *  についても制限はありません。
 *  このプラグインはもうあなたのものです。
 */

(()=> {
    'use strict';
    const script = document.currentScript;
    const param = PluginManagerEx.createParameter(script);
    if (!param.slowlyTerrainTags) {
        param.slowlyTerrainTags = [];
    }
    if (!param.fasterTerrainTags) {
        param.fasterTerrainTags = [];
    }
    if (!param.slowlyRegions) {
        param.slowlyRegions = [];
    }
    if (!param.fasterRegions) {
        param.fasterRegions = [];
    }

    //=============================================================================
    // Game_CharacterBase
    //  地形による速度変化を設定
    //=============================================================================
    const _Game_CharacterBase_realMoveSpeed      = Game_CharacterBase.prototype.realMoveSpeed;
    Game_CharacterBase.prototype.realMoveSpeed = function() {
        const speed = _Game_CharacterBase_realMoveSpeed.apply(this, arguments) +
            this.changeSpeedByTerrainTags() + this.changeSpeedByRegions();
        return this.changeSpeedByNote(speed);
    };

    Game_CharacterBase.prototype.changeSpeedByNote = function(speed) {
        if (!(this instanceof Game_Player) && !(this instanceof Game_Follower)) {
            return speed;
        }
        $gameParty.battleMembers().forEach(function(member) {
            member.traitObjects().forEach(function(obj) {
                const terrainNote = PluginManagerEx.findMetaValue(obj, ['速度地形指定']);
                if (terrainNote) {
                    speed = this.findSpeedByNote(terrainNote, this.terrainTag(), speed);
                }
                const regionNote = PluginManagerEx.findMetaValue(obj,['速度リージョン指定']);
                if (regionNote) {
                    speed = this.findSpeedByNote(regionNote, this.regionId(), speed);
                }
            }, this);
        }, this);
        return speed;
    };

    Game_CharacterBase.prototype.findSpeedByNote = function(noteText, id, defaultSpeed) {
        const notes = noteText.split(',');
        if (parseInt(notes[0]) !== id || !notes[1]) {
            return defaultSpeed;
        }
        const sign = notes[1][0];
        if (sign === '-' || sign === '+') {
            return defaultSpeed + parseInt(notes[1]) * this.getDeltaSpeed();
        } else {
            return parseInt(notes[1]) || defaultSpeed;
        }
    };

    Game_CharacterBase.prototype.changeSpeedByTerrainTags = function() {
        const terrainTag = this.terrainTag();
        let speed      = 0;
        if (param.slowlyTerrainTags.contains(terrainTag)) {
            speed -= this.getDeltaSpeed();
        }
        if (param.fasterTerrainTags.contains(terrainTag)) {
            speed += this.getDeltaSpeed();
        }
        return speed;
    };

    Game_CharacterBase.prototype.changeSpeedByRegions = function() {
        const region = this.regionId();
        let speed  = 0;
        if (param.slowlyRegions.contains(region)) {
            speed -= this.getDeltaSpeed();
        }
        if (param.fasterRegions.contains(region)) {
            speed += this.getDeltaSpeed();
        }
        return speed;
    };

    Game_CharacterBase.prototype.getDeltaSpeed = function() {
        return param.deltaSpeed;
    };

    //=============================================================================
    // Game_Follower
    //  実移動速度を再定義
    //=============================================================================
    Game_Follower.prototype.realMoveSpeed = function() {
        return _Game_CharacterBase_realMoveSpeed.apply(this, arguments);
    };
})();

