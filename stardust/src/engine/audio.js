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
      const arrayBuffer = await this.loadData(data);
      const buffer = await this.context.decodeAudioData(arrayBuffer);
      this.buffers.set(key, buffer);
    }
  }

  async loadData(data) {
    if (typeof data === "string" && data.startsWith("data:")) {
      return this.decodeDataUri(data);
    }
    const response = await fetch(data);
    return response.arrayBuffer();
  }

  decodeDataUri(uri) {
    const commaIndex = uri.indexOf(",");
    if (commaIndex === -1) {
      throw new Error("Invalid data URI");
    }
    const base64 = uri.slice(commaIndex + 1);
    const binary = atob(base64);
    const length = binary.length;
    const bytes = new Uint8Array(length);
    for (let i = 0; i < length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
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
