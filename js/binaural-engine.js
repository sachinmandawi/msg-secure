/**
 * Msg Secure - Real-Time Web Audio API Binaural Beats & Ambient Noise Synthesizer
 */

export class BinauralEngine {
  constructor() {
    this.audioCtx = null;
    this.isPlaying = false;

    // Oscillators & Pan Nodes
    this.oscLeft = null;
    this.oscRight = null;
    this.panLeft = null;
    this.panRight = null;

    // Master Gain & Analyser
    this.masterGain = null;
    this.analyser = null;

    // Ambient Noise Nodes
    this.pinkGain = null;
    this.brownGain = null;
    this.whiteGain = null;
    this.pinkSource = null;
    this.brownSource = null;
    this.whiteSource = null;

    // Default Audio Parameters
    this.carrierFreq = 200; // Carrier pitch (Hz)
    this.beatFreq = 10;     // Binaural offset (Hz) -> Alpha wave by default
    this.masterVol = 0.5;
    this.waveform = "sine";

    // Timer handle
    this.timerInterval = null;
    this.timerSecondsRemaining = 0;
  }

  initContext() {
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContext();
    }
    if (this.audioCtx.state === "suspended") {
      this.audioCtx.resume();
    }
  }

  start() {
    this.initContext();
    if (this.isPlaying) return;

    const now = this.audioCtx.currentTime;

    // Master Gain & Analyser
    this.masterGain = this.audioCtx.createGain();
    this.masterGain.gain.setValueAtTime(this.masterVol, now);

    this.analyser = this.audioCtx.createAnalyser();
    this.analyser.fftSize = 2048;

    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.audioCtx.destination);

    // Left Channel (Carrier)
    this.oscLeft = this.audioCtx.createOscillator();
    this.oscLeft.type = this.waveform;
    this.oscLeft.frequency.setValueAtTime(this.carrierFreq, now);

    this.panLeft = this.audioCtx.createStereoPanner ? this.audioCtx.createStereoPanner() : null;
    if (this.panLeft) {
      this.panLeft.pan.setValueAtTime(-1, now); // Left Ear
      this.oscLeft.connect(this.panLeft);
      this.panLeft.connect(this.masterGain);
    } else {
      this.oscLeft.connect(this.masterGain);
    }

    // Right Channel (Carrier + Beat Offset)
    this.oscRight = this.audioCtx.createOscillator();
    this.oscRight.type = this.waveform;
    this.oscRight.frequency.setValueAtTime(this.carrierFreq + this.beatFreq, now);

    this.panRight = this.audioCtx.createStereoPanner ? this.audioCtx.createStereoPanner() : null;
    if (this.panRight) {
      this.panRight.pan.setValueAtTime(1, now); // Right Ear
      this.oscRight.connect(this.panRight);
      this.panRight.connect(this.masterGain);
    } else {
      this.oscRight.connect(this.masterGain);
    }

    this.oscLeft.start(now);
    this.oscRight.start(now);

    // Setup Ambient Noise Layers
    this.setupAmbientNoise();

    this.isPlaying = true;
  }

  stop() {
    if (!this.isPlaying) return;

    const now = this.audioCtx ? this.audioCtx.currentTime : 0;
    if (this.masterGain && this.audioCtx) {
      this.masterGain.gain.linearRampToValueAtTime(0.001, now + 0.1);
    }

    setTimeout(() => {
      try {
        if (this.oscLeft) this.oscLeft.stop();
        if (this.oscRight) this.oscRight.stop();
        if (this.pinkSource) this.pinkSource.stop();
        if (this.brownSource) this.brownSource.stop();
        if (this.whiteSource) this.whiteSource.stop();
      } catch (e) {}

      this.isPlaying = false;
      this.stopTimer();
    }, 120);
  }

  setFrequencies(carrier, beat) {
    this.carrierFreq = parseFloat(carrier) || 200;
    this.beatFreq = parseFloat(beat) || 10;

    if (this.isPlaying && this.audioCtx) {
      const now = this.audioCtx.currentTime;
      this.oscLeft.frequency.linearRampToValueAtTime(this.carrierFreq, now + 0.05);
      this.oscRight.frequency.linearRampToValueAtTime(this.carrierFreq + this.beatFreq, now + 0.05);
    }
  }

  setMasterVolume(vol) {
    this.masterVol = parseFloat(vol);
    if (this.isPlaying && this.masterGain && this.audioCtx) {
      const now = this.audioCtx.currentTime;
      this.masterGain.gain.linearRampToValueAtTime(this.masterVol, now + 0.05);
    }
  }

  setWaveform(type) {
    this.waveform = type;
    if (this.isPlaying && this.oscLeft && this.oscRight) {
      this.oscLeft.type = type;
      this.oscRight.type = type;
    }
  }

  /* Ambient Noise Layering (Pink, Brown, White Noise Generators) */
  setupAmbientNoise() {
    if (!this.audioCtx) return;

    const bufferSize = 2 * this.audioCtx.sampleRate;

    // Pink Noise Buffer (Rain)
    const pinkBuffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
    const pData = pinkBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      pData[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.05;
      b6 = white * 0.115926;
    }

    this.pinkSource = this.audioCtx.createBufferSource();
    this.pinkSource.buffer = pinkBuffer;
    this.pinkSource.loop = true;
    this.pinkGain = this.audioCtx.createGain();
    this.pinkGain.gain.value = 0; // Default off
    this.pinkSource.connect(this.pinkGain);
    this.pinkGain.connect(this.masterGain);
    this.pinkSource.start();

    // Brown Noise Buffer (Deep Ocean Hum)
    const brownBuffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
    const brData = brownBuffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      brData[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = brData[i];
      brData[i] *= 1.8;
    }

    this.brownSource = this.audioCtx.createBufferSource();
    this.brownSource.buffer = brownBuffer;
    this.brownSource.loop = true;
    this.brownGain = this.audioCtx.createGain();
    this.brownGain.gain.value = 0; // Default off
    this.brownSource.connect(this.brownGain);
    this.brownGain.connect(this.masterGain);
    this.brownSource.start();
  }

  setAmbientVolume(type, vol) {
    const val = parseFloat(vol) || 0;
    if (type === "pink" && this.pinkGain) this.pinkGain.gain.value = val;
    if (type === "brown" && this.brownGain) this.brownGain.gain.value = val;
  }

  /* Session Timer & Auto-Fadeout */
  startTimer(minutes, onTickCallback, onCompleteCallback) {
    this.stopTimer();
    if (!minutes || minutes <= 0) return;

    this.timerSecondsRemaining = minutes * 60;

    this.timerInterval = setInterval(() => {
      this.timerSecondsRemaining--;
      if (onTickCallback) onTickCallback(this.timerSecondsRemaining);

      if (this.timerSecondsRemaining <= 0) {
        this.stop();
        if (onCompleteCallback) onCompleteCallback();
        this.stopTimer();
      }
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }
}
