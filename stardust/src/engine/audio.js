import { SFX, BGM } from "../audio/index.js";

export class AudioManager {
  constructor(settings) {
    this.settings = settings;
    this.buffers = new Map();
    this.context = null;
    this.muted = false;
    this.gainNode = null;
  }

  async init() {
    if (!window.AudioContext) {
      this.muted = true;
      return;
    }
    this.context = new AudioContext();
    this.gainNode = this.context.createGain();
    this.gainNode.connect(this.context.destination);
    this.updateVolume();
    await this.preload();
    this.playLoop(BGM);
  }

  updateVolume() {
    if (this.gainNode) {
      this.gainNode.gain.value = this.settings.volume * (this.settings.muted ? 0 : 1);
    }
  }

  async preload() {
    const entries = Object.entries({ ...SFX, bgm: BGM });
    for (const [key, data] of entries) {
      const response = await fetch(data);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = await this.context.decodeAudioData(arrayBuffer);
      this.buffers.set(key, buffer);
    }
  }

  play(name) {
    if (this.settings.muted || !this.context) return;
    const buffer = this.buffers.get(name);
    if (!buffer) return;
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.gainNode);
    source.start(0);
  }

  playLoop(data) {
    if (this.settings.muted || !this.context) return;
    const buffer = this.buffers.get("bgm");
    if (!buffer) return;
    if (this.loopSource) {
      this.loopSource.stop();
    }
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(this.gainNode);
    source.start(0);
    this.loopSource = source;
  }
}
