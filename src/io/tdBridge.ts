// tdBridge.ts — DORMANT TouchDesigner bridge. No socket, no timer, no console until the
// user presses Connect. Removing this file entirely must not break the build (main.ts
// only wires it optionally). Subscribes to HadoFeatures; never imports field/geometry.
import type { HadoFeatures } from "../core/features";
import type { ParamState } from "../core/params";

export type BridgeStatus = "idle" | "connecting" | "open" | "closed" | "error";

export class TdBridge {
  private ws: WebSocket | null = null;
  private reconnect = false;         // only after a successful manual connect
  private reconnectTimer = 0;
  private lastState = 0;
  private lastField = 0;
  status: BridgeStatus = "idle";
  onStatus: ((s: BridgeStatus) => void) | null = null;
  private url = "ws://localhost:9980";

  connect(url: string): void {
    this.url = url;
    this.reconnect = true;
    this.open();
  }

  private open(): void {
    this.setStatus("connecting");
    try {
      this.ws = new WebSocket(this.url);
      this.ws.binaryType = "arraybuffer";
      this.ws.onopen = () => this.setStatus("open");
      this.ws.onclose = () => {
        this.setStatus("closed");
        if (this.reconnect) {
          this.reconnectTimer = window.setTimeout(() => this.open(), 3000);
        }
      };
      this.ws.onerror = () => this.setStatus("error");
    } catch {
      this.setStatus("error");
    }
  }

  disconnect(): void {
    this.reconnect = false;
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = 0; }
    this.ws?.close();
    this.ws = null;
    this.setStatus("idle");
  }

  private setStatus(s: BridgeStatus): void {
    this.status = s;
    this.onStatus?.(s);
  }

  private isOpen(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  // JSON state at wsRate.
  sendState(f: HadoFeatures, p: ParamState, nowMs: number): void {
    if (!this.isOpen()) return;
    const period = 1000 / (p.wsRate as number);
    if (nowMs - this.lastState < period) return;
    this.lastState = nowMs;
    this.ws!.send(JSON.stringify({
      type: "state", t: f.t,
      params: p,
      modes: f.modes,
      probes: f.probes.map((pr) => [pr.x, pr.y, pr.p, pr.gradAngle]),
      analysis: f.analysis,
    }));
  }

  sendEvent(kind: string, data: Record<string, number>): void {
    if (!this.isOpen()) return;
    this.ws!.send(JSON.stringify({ type: "event", kind, ...data }));
  }

  // Binary |ψ|² frame (0x01 + Float32 64×64) at fieldRate, reusing reduced readback.
  sendField(reduced: Float32Array, p: ParamState, nowMs: number): void {
    if (!this.isOpen() || !(p.sendField as boolean)) return;
    const period = 1000 / (p.fieldRate as number);
    if (nowMs - this.lastField < period) return;
    this.lastField = nowMs;
    const N = 64;
    const out = new Float32Array(N * N);
    let max = 1e-9;
    for (let i = 0; i < N * N; i++) { const v = reduced[i * 4]; out[i] = v; if (v > max) max = v; }
    for (let i = 0; i < out.length; i++) out[i] /= max;
    const buf = new Uint8Array(1 + out.byteLength);
    buf[0] = 0x01;
    buf.set(new Uint8Array(out.buffer), 1);
    this.ws!.send(buf);
  }
}
