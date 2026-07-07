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
  sendField: "場送信", fieldRate: "場レート",
};

export function paramLabel(name: ParamName): string {
  if (current === "JP") return PARAM_JA[name] ?? PARAMS[name].label;
  return PARAMS[name].label;
}

const STRINGS: Record<Lang, Record<string, string>> = {
  EN: {
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
