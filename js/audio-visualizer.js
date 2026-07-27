/**
 * Msg Secure - Real-Time Audio Canvas Visualizer (Oscilloscope & Spectrum)
 */

export class AudioVisualizer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas ? this.canvas.getContext("2d") : null;
    this.animId = null;
  }

  start(analyser) {
    if (!this.canvas || !this.ctx || !analyser) return;
    this.stop();

    const bufferLength = analyser.frequencyBinCount;
    const timeData = new Uint8Array(bufferLength);
    const freqData = new Uint8Array(bufferLength);

    const render = () => {
      this.animId = requestAnimationFrame(render);

      const width = this.canvas.width;
      const height = this.canvas.height;

      analyser.getByteTimeDomainData(timeData);
      analyser.getByteFrequencyData(freqData);

      // Background Fade
      this.ctx.fillStyle = "rgba(7, 9, 14, 0.25)";
      this.ctx.fillRect(0, 0, width, height);

      // 1. Draw Frequency Spectrum Bars (Background Glow)
      const barWidth = (width / bufferLength) * 2.5;
      let barX = 0;
      for (let i = 0; i < bufferLength; i += 4) {
        const barHeight = (freqData[i] / 255) * (height * 0.5);
        
        const gradient = this.ctx.createLinearGradient(0, height, 0, height - barHeight);
        gradient.addColorStop(0, "rgba(0, 243, 255, 0.05)");
        gradient.addColorStop(1, "rgba(157, 78, 221, 0.4)");

        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(barX, height - barHeight, barWidth, barHeight);

        barX += barWidth + 1;
      }

      // 2. Draw Oscilloscope Glowing Sine Wave (Foreground Line)
      this.ctx.lineWidth = 3;
      this.ctx.strokeStyle = "#00f3ff";
      this.ctx.shadowBlur = 12;
      this.ctx.shadowColor = "#00f3ff";

      this.ctx.beginPath();
      const sliceWidth = (width * 1.0) / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = timeData[i] / 128.0; // 0..2
        const y = (v * height) / 2;

        if (i === 0) {
          this.ctx.moveTo(x, y);
        } else {
          this.ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      this.ctx.lineTo(width, height / 2);
      this.ctx.stroke();

      // Reset shadow for performance
      this.ctx.shadowBlur = 0;
    };

    render();
  }

  stop() {
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
    if (this.canvas && this.ctx) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }
}
