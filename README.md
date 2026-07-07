# HADŌ / 波動庭

Quantum-field botanical browser instrument — EL-SYSTEMA successor (籠目 / SAYA / TSUKI).

The time-independent Schrödinger equation `−∇²ψ + Vψ = Eψ` is the same mathematics as
the Helmholtz equation of a vibrating membrane: quantum stationary states **are** acoustic
eigenmodes. HADŌ generates the potential `V(x,y)` from plant geometry (phyllotaxis /
L-system / Voronoi cells), evolves `ψ` on the GPU, extracts eigen-energies as partials,
and sonifies superposition (drone), observation (strike) and probability flux (grains).

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # tsc + vite → dist/  (Cloudflare Pages ready)
npm run preview
```

Target: latest desktop **Chrome / Edge** (WebGL2 + `EXT_color_buffer_float`, Web Audio,
WebMIDI). Click anywhere to start audio.

## Play

- **Click canvas** — observe (collapse ψ + modal strike at that point).
- **Drag** — brush the potential (dig); **Shift+drag** — raise walls.
- **Knobs** — vertical drag; double-click resets to default.
- **16-step row** — toggle steps; long-press cycles step probability (.25/.5/.75/1).
- **Tabs** — GEO / FIELD / SOUND / SEQ / MUTATE / IO.
- **Keyboard** — `Space` play/stop sequencer · `R` reset field · `F` freeze mutation.
- **Presets** — Garden / Lattice / Cells built in; save (localStorage) + JSON export/import.

## Three sound layers

- **MACRO** — eigen-mode sine drone (+light FM), one voice per spectral peak.
- **MID** — collapse strike: 6-band modal resonator (circular-membrane ratios), scale-quantised.
- **MICRO** — probe-driven granular; `|ψ|²` sets density, phase gradient sets pan.

## Feedback loop (MUTATE)

Acoustic features slowly grow the geometry: `rms`→L-system growth / well deepening,
`centroid`→golden-angle drift, `flux`→cell split/merge. `feedAmount` masters depth,
`freeze` pauses, and a runaway guard halves `feedAmount` if it stays hot >5 s.

## Architecture

`src/core/features.ts` (`HadoFeatures`) is the **only** contact between the field and the
audio/IO layers — nothing in `audio/` or `io/` imports `field/` or `geometry/`. This is the
seam for a future merge into `el-systema-core`: one adapter maps `HadoFeatures` onto the
shared geometry-feature contract.

```
geometry/ → potential V ──► field/ (WebGL2 Visscher ψ) ──► features.ts ──► audio/  → master
                                                                        └─► io/midi, io/tdBridge
                              feedback/mutate ◄── analysis (rms/centroid/flux) ◄───────┘
```

## TouchDesigner bridge — dormant

`io/tdBridge.ts` is fully dormant by default: **no socket, no timer, no console output**
until you press **Connect** in the IO tab. It only subscribes to `HadoFeatures`; deleting
the file does not affect the build. Auto-reconnect (3 s) is armed only after a successful
manual connect and is cancelled by Disconnect.

Transport: browser = WebSocket **client**, TD = **server** (WebSocket DAT, port 9980).
State JSON at `wsRate` (default 30 fps); binary `|ψ|²` frames (`0x01` + `Float32 64×64`,
normalised) at `fieldRate` (default 15 fps) when `sendField` is on.

### TouchDesigner receiver (WebSocket DAT, server mode, port 9980)

```python
import json, struct

def onReceiveText(dat, rowIndex, message):
    d = json.loads(message)
    if d['type'] == 'state':
        t = op('state_table')            # Table DAT → DAT to CHOP
        t.clear()
        for m in d['modes']:
            t.appendRow([f"mode{m['n']}_f", m['f']])
            t.appendRow([f"mode{m['n']}_a", m['a']])
        for k, v in d['analysis'].items():
            t.appendRow([k, v])
    elif d['type'] == 'event' and d['kind'] == 'collapse':
        op('collapse_exec').run(d['x'], d['y'], d['vel'])   # Script CHOP pulse

def onReceiveBinary(dat, contents):
    if contents[0] == 0x01:
        import numpy as np
        arr = np.frombuffer(contents[1:], dtype=np.float32).reshape(64, 64)
        op('field_script_top').store('field', arr)          # Script TOP onCook reads it
```

Acceptance (once TD is available): 30 fps JSON + 15 fps binary received, collapse events
detected within one frame, 60 fps maintained with `sendField` on.

## Extension notes (not implemented)

- **響庭 (resonant garden)**: contact-mic input as a real-time excitation source for `V`.
- **TD Phase B/C**: field as Script TOP → GLSL re-interpretation; headless browser.
- **3-machine integration**: join 籠目 / SAYA / TSUKI under one geometry→sound OS in
  `el-systema-core`.
- **Hardware**: 7-inch + 6 encoders + 4-tab enclosure (existing drawings).
