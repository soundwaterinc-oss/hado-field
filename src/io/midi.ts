// midi.ts — WebMIDI out: NoteOn on collapse, CC map (rms/centroid/mode amps) at 30Hz.
import type { HadoFeatures } from "../core/features";
import type { ParamState } from "../core/params";

export class MidiOut {
  private access: MIDIAccess | null = null;
  private port: MIDIOutput | null = null;
  private lastCC = 0;
  devices: { id: string; name: string }[] = [];

  async enable(): Promise<boolean> {
    if (!navigator.requestMIDIAccess) return false;
    try {
      this.access = await navigator.requestMIDIAccess();
      this.refreshDevices();
      return true;
    } catch {
      return false;
    }
  }

  refreshDevices(): void {
    if (!this.access) return;
    this.devices = [];
    this.access.outputs.forEach((o) => this.devices.push({ id: o.id, name: o.name ?? o.id }));
    if (!this.port && this.devices.length) this.select(this.devices[0].id);
  }

  select(id: string): void {
    this.port = this.access?.outputs.get(id) ?? null;
  }

  noteOn(freq: number, velocity: number, durationS: number, ch: number): void {
    if (!this.port) return;
    const note = Math.round(69 + 12 * Math.log2(freq / 440));
    const vel = Math.max(1, Math.min(127, Math.round(velocity * 127)));
    const status = 0x90 | ((ch - 1) & 0x0f);
    this.port.send([status, note & 0x7f, vel]);
    this.port.send([0x80 | ((ch - 1) & 0x0f), note & 0x7f, 0], performance.now() + durationS * 1000);
  }

  // CC20=rms, CC21=centroid, CC22..29=mode amps. Only on change, ~30Hz.
  sendCC(f: HadoFeatures, p: ParamState, nowMs: number): void {
    if (!this.port || nowMs - this.lastCC < 33) return;
    this.lastCC = nowMs;
    const ch = (p.midiCh as number) - 1;
    const status = 0xb0 | (ch & 0x0f);
    const cc = (num: number, val01: number): void => {
      this.port!.send([status, num, Math.max(0, Math.min(127, Math.round(val01 * 127)))]);
    };
    cc(20, Math.min(1, f.analysis.rms * 4));
    cc(21, Math.min(1, f.analysis.centroid / 8000));
    for (let i = 0; i < 8; i++) cc(22 + i, f.modes[i]?.a ?? 0);
  }
}
