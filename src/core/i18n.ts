// i18n.ts — EN/JP UI language. paramLabel() covers knob names; t() covers everything else
// (tabs, buttons, headers, notes). Persisted in localStorage.
import { PARAMS, type ParamName } from "./params";

export type Lang = "EN" | "JP";
const LS_KEY = "hado.lang";

let current: Lang = (localStorage.getItem(LS_KEY) as Lang) || "EN";
export function getLang(): Lang { return current; }
export function setLang(l: Lang): void { current = l; localStorage.setItem(LS_KEY, l); }
export function toggleLang(): Lang { setLang(current === "EN" ? "JP" : "EN"); return current; }

const PARAM_JA: Partial<Record<ParamName, string>> = {
  geoMode: "幾何モード", geoModeA: "ハイブリッドA", geoModeB: "ハイブリッドB", seedCount: "種数",
  angleOffset: "角度オフセット", wellDepth: "井戸の深さ", wellRadius: "井戸半径",
  lsysIterations: "L反復", branchAngle: "分岐角", lsysSeed: "Lシード", cellCount: "細胞数",
  relax: "Lloyd緩和", wallWidth: "壁の幅", wallHeight: "壁の高さ", geoMix: "幾何ミックス",
  brushRadius: "ブラシ半径", brushDepth: "ブラシ深度",
  packetX: "パケットX", packetY: "パケットY", packetWidth: "パケット幅", px: "運動量X", py: "運動量Y",
  substeps: "サブステップ", damping: "減衰", boundary: "境界", gamma: "ガンマ",
  hueShift: "色相回転", vOverlay: "V重ね",
  modeCount: "モード数", fRoot: "基音", warp: "ワープ", partialGlide: "部分音グライド",
  droneLevel: "ドローン音量", fmAmount: "FM量", collapseSharpness: "収縮σ",
  strikeDecay: "打撃減衰", strikeTone: "打撃音色", strikeLevel: "打撃音量",
  probeCount: "プローブ数", grainDensity: "グレイン密度", grainSize: "グレイン長",
  grainJitter: "グレイン揺らぎ", grainLevel: "グレイン音量", grainSrc: "グレイン源",
  drive: "ドライブ", delayTime: "ディレイ時間", delayFb: "ディレイFB",
  reverbSize: "リバーブ長", reverbMix: "リバーブ量",
  fxSendMacro: "FX送りMacro", fxSendMid: "FX送りMid", fxSendMicro: "FX送りMicro",
  bpm: "テンポ", measureMode: "測定方式", poissonRate: "ポアソンレート",
  poissonAmount: "ポアソン量", scaleQuantize: "スケール", transpose: "移調",
  feedAmount: "帰還量", mutateRate: "変性レート", mutateSmooth: "変性平滑",
  rmsTarget: "RMS目標", centTarget: "重心目標", freeze: "凍結",
  midiEnable: "MIDI有効", midiCh: "MIDIチャンネル", wsRate: "WS送信レート",
  sendField: "場送信", fieldRate: "場レート", masterGain: "マスター音量",
};

const DESC_EN: Partial<Record<ParamName, string>> = {
  geoMode: "which plant geometry builds the potential V (wells & walls)",
  geoModeA: "source A blended in HYBRID mode", geoModeB: "source B blended in HYBRID mode",
  seedCount: "number of phyllotaxis seeds / wells",
  angleOffset: "nudge the golden angle — swirls the spiral",
  wellDepth: "depth of each well (how strongly it traps the wave)", wellRadius: "size of each well",
  lsysIterations: "L-system growth depth (branch complexity)", branchAngle: "L-system branch angle",
  lsysSeed: "random seed (reproducible L-system / Voronoi)", cellCount: "number of Voronoi cells",
  relax: "Lloyd relaxation passes (evens out cells)", wallWidth: "barrier wall thickness",
  wallHeight: "barrier wall height (reflects the wave)", geoMix: "crossfade A↔B in HYBRID",
  brushRadius: "canvas brush size", brushDepth: "brush amount: dig (−) / raise (+)",
  packetX: "initial wave-packet x", packetY: "initial wave-packet y", packetWidth: "wave-packet size",
  px: "initial momentum x", py: "initial momentum y",
  substeps: "sim steps per frame (accuracy vs cost)", damping: "bleeds energy so the sim stays stable",
  boundary: "reflect (box) or absorb (soft edges)", gamma: "brightness curve of |ψ|²",
  hueShift: "rotate phase → hue mapping", vOverlay: "show the potential walls",
  modeCount: "how many spectral peaks become drone partials", fRoot: "base frequency of the drone",
  warp: "spectrum → pitch curve (spread of partials)", partialGlide: "how fast partials glide to new pitches",
  droneLevel: "eigenmode drone level", fmAmount: "light FM depth on each partial",
  collapseSharpness: "how tightly an observation collapses ψ", strikeDecay: "collapse-strike length",
  strikeTone: "stretches the modal strike ratios", strikeLevel: "collapse-strike level",
  probeCount: "number of granular probe points", grainDensity: "max grains per second",
  grainSize: "grain length", grainJitter: "pitch wobble on short grains", grainLevel: "granular level",
  grainSrc: "grain source: sine or filtered noise", drive: "waveshaper drive on the FX send",
  delayTime: "delay time", delayFb: "delay feedback", reverbSize: "reverb length",
  reverbMix: "reverb send", fxSendMacro: "drone → FX send", fxSendMid: "strike → FX send",
  fxSendMicro: "grains → FX send", masterGain: "final output level",
  bpm: "sequencer tempo", measureMode: "STEP grid · POISSON random · MIX both",
  poissonRate: "average observations per second (POISSON)", poissonAmount: "random jitter added in MIX",
  scaleQuantize: "scale the strike snaps to", transpose: "semitone transpose",
  feedAmount: "depth of audio → geometry feedback (0 = off)", mutateRate: "how often geometry mutates",
  mutateSmooth: "smoothing of the mutation", rmsTarget: "loudness the feedback aims for",
  centTarget: "brightness the feedback aims for", freeze: "pause the mutation loop",
  midiEnable: "enable WebMIDI output", midiCh: "MIDI channel", wsRate: "TouchDesigner JSON send rate",
  sendField: "stream the 64×64 |ψ|² field to TD", fieldRate: "TD field-frame rate",
};
const DESC_JP: Partial<Record<ParamName, string>> = {
  geoMode: "ポテンシャルV（井戸と壁）を作る植物幾何の種類",
  geoModeA: "HYBRID時に混ぜる素材A", geoModeB: "HYBRID時に混ぜる素材B",
  seedCount: "フィロタキシスの種（井戸）の数", angleOffset: "黄金角を微調整——螺旋が渦を巻く",
  wellDepth: "各井戸の深さ（波を捕える強さ）", wellRadius: "各井戸の大きさ",
  lsysIterations: "L-systemの成長段階（枝の複雑さ）", branchAngle: "L-systemの分岐角",
  lsysSeed: "乱数シード（再現用）", cellCount: "ボロノイ細胞の数",
  relax: "Lloyd緩和の回数（細胞を均す）", wallWidth: "障壁の壁の厚み",
  wallHeight: "障壁の壁の高さ（波を反射）", geoMix: "HYBRIDのA↔Bクロスフェード",
  brushRadius: "ブラシ半径", brushDepth: "ブラシ量：掘る(−)/盛る(+)",
  packetX: "初期波束のX位置", packetY: "初期波束のY位置", packetWidth: "波束の大きさ",
  px: "初期運動量X", py: "初期運動量Y",
  substeps: "1フレームのシミュ回数（精度⇄負荷）", damping: "エネルギーを逃がし発散を防ぐ",
  boundary: "reflect（箱）/ absorb（柔らかい端）", gamma: "|ψ|²の明るさカーブ",
  hueShift: "位相→色相の回転", vOverlay: "ポテンシャルの壁を表示",
  modeCount: "ドローンの部分音になるスペクトルのピーク数", fRoot: "ドローンの基音",
  warp: "スペクトル→ピッチのカーブ（部分音の広がり）", partialGlide: "部分音が新ピッチへ滑る速さ",
  droneLevel: "固有モードドローンの音量", fmAmount: "各部分音への軽いFMの深さ",
  collapseSharpness: "観測がψを収縮させる鋭さ", strikeDecay: "収縮打撃の長さ",
  strikeTone: "モーダル打撃の比をストレッチ", strikeLevel: "収縮打撃の音量",
  probeCount: "グラニュラーのプローブ点の数", grainDensity: "毎秒の最大グレイン数",
  grainSize: "グレインの長さ", grainJitter: "短いグレインのピッチ揺らぎ", grainLevel: "グラニュラーの音量",
  grainSrc: "グレイン源：サイン/フィルタノイズ", drive: "FX送りのウェーブシェイパー",
  delayTime: "ディレイ時間", delayFb: "ディレイのフィードバック", reverbSize: "残響の長さ",
  reverbMix: "残響の送り", fxSendMacro: "ドローン→FX送り", fxSendMid: "打撃→FX送り",
  fxSendMicro: "グレイン→FX送り", masterGain: "最終出力レベル",
  bpm: "シーケンサのテンポ", measureMode: "STEP格子 · POISSON乱数 · MIX両方",
  poissonRate: "毎秒の平均観測数（POISSON）", poissonAmount: "MIXで加える乱数ゆらぎ",
  scaleQuantize: "打撃が吸着するスケール", transpose: "半音移調",
  feedAmount: "音→幾何フィードバックの深さ（0で停止）", mutateRate: "幾何が変性する頻度",
  mutateSmooth: "変性の平滑化", rmsTarget: "フィードバックが目指す音量",
  centTarget: "フィードバックが目指す明るさ", freeze: "変性ループを一時停止",
  midiEnable: "WebMIDI出力を有効化", midiCh: "MIDIチャンネル", wsRate: "TD JSON送信レート",
  sendField: "64×64 |ψ|² 場をTDへ送出", fieldRate: "TD場フレームレート",
};
export function paramDesc(name: ParamName): string {
  return (current === "JP" ? DESC_JP[name] : DESC_EN[name]) ?? "";
}

export function paramLabel(name: ParamName): string {
  if (current === "JP") return PARAM_JA[name] ?? PARAMS[name].label;
  return PARAMS[name].label;
}

const STRINGS: Record<Lang, Record<string, string>> = {
  EN: {
    "tab.PERFORM": "PLAY", "tab.INFO": "INFO",
    perform: "PERFORMANCE", quickPresets: "PRESETS", gateModeLabel: "MODE",
    conceptTitle: "HADŌ / 波動庭 — concept",
    concept:
      "The time-independent Schrödinger equation −∇²ψ + Vψ = Eψ is the same mathematics as a " +
      "vibrating membrane: quantum stationary states ARE acoustic modes. Plant geometry " +
      "(phyllotaxis / L-system / Voronoi) shapes a potential V; a wave packet ψ evolves on it. " +
      "Superposition is a drone (eigenmode partials); observation collapses ψ into a modal strike; " +
      "probe points read |ψ|² into granular texture. The master output slowly mutates the geometry, " +
      "so the garden grows as you play.\n\n" +
      "Click the field to observe (collapse + strike). Drag to brush the potential (Shift = raise). " +
      "Space plays the sequencer; R resets the field; F freezes the mutation loop.",
    "tab.GEO": "GEO", "tab.FIELD": "FIELD", "tab.SOUND": "SOUND", "tab.SEQ": "SEQ",
    "tab.MUTATE": "MUTATE", "tab.IO": "IO",
    save: "save", export: "export", import: "import",
    connect: "connect", disconnect: "disconnect", enableMidi: "enable midi",
    presetName: "preset name", macros: "MACROS", output: "OUTPUT", presets: "PRESETS",
    midiOut: "MIDI out", tdBridge: "TouchDesigner bridge",
    seqNote: "Space=play/stop · click canvas=observe · R=reset · F=freeze",
    ccInfo: "CC20 rms · CC21 centroid · CC22–29 mode1–8 amp",
  },
  JP: {
    "tab.PERFORM": "演奏", "tab.INFO": "説明",
    perform: "演奏コントロール", quickPresets: "プリセット", gateModeLabel: "方式",
    conceptTitle: "HADŌ / 波動庭 — 概念",
    concept:
      "時間非依存シュレディンガー方程式 −∇²ψ + Vψ = Eψ は膜の振動と同じ数学で、量子の定常状態＝音響の固有モードです。" +
      "植物の幾何（フィロタキシス／L-system／ボロノイ）がポテンシャルVを形づくり、その上を波束ψが時間発展します。" +
      "重ね合わせはドローン（固有モードの部分音）、観測はψを収縮させモーダル打撃に、プローブ点は |ψ|² を" +
      "グラニュラーの質感として読み取ります。マスター出力はゆっくり幾何を変性させ、弾くほど庭が育ちます。\n\n" +
      "キャンバスをクリックで観測（収縮＋打撃）。ドラッグでポテンシャルを掘る（Shiftで盛る）。" +
      "Spaceでシーケンサ再生、Rで場リセット、Fで変性ループ凍結。",
    "tab.GEO": "幾何", "tab.FIELD": "場", "tab.SOUND": "音", "tab.SEQ": "列",
    "tab.MUTATE": "変性", "tab.IO": "入出力",
    save: "保存", export: "書出", import: "読込",
    connect: "接続", disconnect: "切断", enableMidi: "MIDI有効化",
    presetName: "プリセット名", macros: "マクロ", output: "出力", presets: "プリセット",
    midiOut: "MIDI出力", tdBridge: "TouchDesigner連携",
    seqNote: "Space=再生/停止 · キャンバスclick=観測 · R=リセット · F=凍結",
    ccInfo: "CC20 rms · CC21 重心 · CC22–29 モード1–8 振幅",
  },
};

export function t(id: string): string {
  return STRINGS[current][id] ?? STRINGS.EN[id] ?? id;
}

// Scale option labels in kana (shown when JP); EN uses the roman labels passed in.
const SCALE_JA: Record<string, string> = {
  chromatic: "クロマチック", major: "メジャー（セイヨウ）", minor: "マイナー（セイヨウ）",
  dorian: "ドリアン（セイヨウ）", phrygian: "フリジアン（セイヨウ）", lydian: "リディアン（セイヨウ）",
  mixolydian: "ミクソリディアン（セイヨウ）", harmonicMinor: "ハーモニックマイナー（セイヨウ）",
  melodicMinor: "メロディックマイナー（セイヨウ）", penta: "メジャーペンタ", minorPent: "マイナーペンタ",
  blues: "ブルース（アメリカ）", wholeTone: "ホールトーン", just: "ジャストメジャー（セイヨウ）",
  ryukyu: "リュウキュウ（オキナワ）", yo: "ヨ（ニホン）", insen: "インセン（ニホン）",
  hirajoshi: "ヒラジョウシ（ニホン）", iwato: "イワト（ニホン）", kumoi: "クモイ（ニホン）",
  bhairav: "バイラヴ（インド）", yaman: "ヤマン（インド）", todi: "トーディ（インド）", bhairavi: "バイラヴィ（インド）",
  rast: "ラースト（アラブ／トルコ）", hijaz: "ヒジャーズ（アラブ）", bayati: "バヤーティ（アラブ）", saba: "サバー（アラブ）",
  slendro: "スレンドロ（ジャワ）", gamelan: "ガムラン（バリ／ジャワ）", pelog: "ペロッグ（ジャワ）",
  tizita: "ティザータ（エチオピア）", hungarianMinor: "ハンガリアンマイナー（ハンガリー）",
  doubleHarmonic: "ダブルハーモニック（ビザンチン）", phrygianDom: "フリジアンドミナント（アンダルシア）",
};

// resolve an enum option's display text: JP kana if available, else the (roman) label, else the id.
export function enumOptionLabel(id: string, enLabels?: Record<string, string>): string {
  if (current === "JP") return SCALE_JA[id] ?? enLabels?.[id] ?? id;
  return enLabels?.[id] ?? id;
}
