import { CryptoEngine } from "./crypto-engine.js";
import { SteganographyEngine } from "./steganography.js";
import { BinauralEngine } from "./binaural-engine.js";
import { AudioVisualizer } from "./audio-visualizer.js";

const binaural = new BinauralEngine();
let visualizer = null;

document.addEventListener("DOMContentLoaded", () => {
  initMatrixRain();
  initTabNavigation();
  initAESMode();
  initSteganographyMode();
  initKeyGenerator();
  initBinauralStudio();
  checkURLPayload();
});

/* ==========================================================================
   1. Matrix Rain Background Animation
   ========================================================================== */
function initMatrixRain() {
  const canvas = document.getElementById("matrix-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  const characters = "01010101ABCDEFGHIJKLMNOPQRSTUVWXYZ@#$%&*+=-~<>?/λπΩΞ";
  const fontSize = 14;
  let columns = Math.floor(canvas.width / fontSize);
  let drops = Array(columns).fill(1);

  window.addEventListener("resize", () => {
    columns = Math.floor(canvas.width / fontSize);
    drops = Array(columns).fill(1);
  });

  function draw() {
    ctx.fillStyle = "rgba(10, 14, 23, 0.08)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#00f3ff1a";
    ctx.font = `${fontSize}px monospace`;

    for (let i = 0; i < drops.length; i++) {
      const text = characters.charAt(Math.floor(Math.random() * characters.length));
      ctx.fillText(text, i * fontSize, drops[i] * fontSize);

      if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
        drops[i] = 0;
      }
      drops[i]++;
    }
  }

  setInterval(draw, 40);
}

/* ==========================================================================
   2. Tab Navigation
   ========================================================================== */
function initTabNavigation() {
  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabPanes = document.querySelectorAll(".tab-pane");

  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetTab = btn.dataset.tab;

      tabBtns.forEach((b) => b.classList.remove("active"));
      tabPanes.forEach((p) => p.classList.remove("active"));

      btn.classList.add("active");
      const targetPane = document.getElementById(targetTab);
      if (targetPane) targetPane.classList.add("active");

      // Resize visualizer canvas if switching to Binaural tab
      if (targetTab === "tab-binaural" && visualizer && visualizer.canvas) {
        const parentWidth = visualizer.canvas.parentElement.clientWidth;
        visualizer.canvas.width = parentWidth || 800;
      }
    });
  });
}

/* ==========================================================================
   3. AES-256-GCM Encryption / Decryption Handlers
   ========================================================================== */
function initAESMode() {
  const aesEncryptBtn = document.getElementById("aes-encrypt-btn");
  const aesDecryptBtn = document.getElementById("aes-decrypt-btn");

  const aesInput = document.getElementById("aes-input");
  const aesPass = document.getElementById("aes-pass");
  const aesOutput = document.getElementById("aes-output");

  if (aesPass) {
    aesPass.addEventListener("input", () => {
      const pass = aesPass.value;
      const score = evaluatePasswordStrength(pass);
      updateStrengthUI(score);
    });
  }

  if (aesEncryptBtn) {
    aesEncryptBtn.addEventListener("click", async () => {
      const text = aesInput.value.trim();
      const pass = aesPass.value;

      try {
        aesEncryptBtn.disabled = true;
        aesEncryptBtn.classList.add("loading");
        
        const ciphertext = await CryptoEngine.encrypt(text, pass);
        aesOutput.value = ciphertext;
        showToast("Message encrypted with AES-256-GCM!", "success");

        const shareUrl = `${window.location.origin}${window.location.pathname}#payload=${encodeURIComponent(ciphertext)}`;
        const shareInput = document.getElementById("aes-share-url");
        if (shareInput) shareInput.value = shareUrl;
      } catch (err) {
        showToast(err.message, "error");
      } finally {
        aesEncryptBtn.disabled = false;
        aesEncryptBtn.classList.remove("loading");
      }
    });
  }

  if (aesDecryptBtn) {
    aesDecryptBtn.addEventListener("click", async () => {
      const ciphertext = aesInput.value.trim();
      const pass = aesPass.value;

      try {
        aesDecryptBtn.disabled = true;
        aesDecryptBtn.classList.add("loading");

        const plaintext = await CryptoEngine.decrypt(ciphertext, pass);
        glitchRevealText(aesOutput, plaintext);
        showToast("Decryption successful!", "success");
      } catch (err) {
        showToast(err.message, "error");
      } finally {
        aesDecryptBtn.disabled = false;
        aesDecryptBtn.classList.remove("loading");
      }
    });
  }

  setupOutputActions("aes");
}

/* ==========================================================================
   4. Image Steganography Handlers
   ========================================================================== */
function initSteganographyMode() {
  const fileInput = document.getElementById("stego-file");
  const dropArea = document.getElementById("stego-drop-area");
  const imgPreview = document.getElementById("stego-preview");

  const stegoText = document.getElementById("stego-input-text");
  const stegoEncodeBtn = document.getElementById("stego-encode-btn");
  const stegoDecodeBtn = document.getElementById("stego-decode-btn");
  const stegoOutputImg = document.getElementById("stego-output-img");
  const stegoOutputText = document.getElementById("stego-output-text");

  if (dropArea && fileInput) {
    dropArea.addEventListener("click", () => fileInput.click());
    dropArea.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropArea.classList.add("dragover");
    });
    dropArea.addEventListener("dragleave", () => dropArea.classList.remove("dragover"));
    dropArea.addEventListener("drop", (e) => {
      e.preventDefault();
      dropArea.classList.remove("dragover");
      if (e.dataTransfer.files.length) {
        handleStegoFile(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener("change", (e) => {
      if (e.target.files.length) {
        handleStegoFile(e.target.files[0]);
      }
    });
  }

  function handleStegoFile(file) {
    if (!file.type.startsWith("image/")) {
      showToast("Please upload an image file (PNG/JPG)", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      imgPreview.src = e.target.result;
      imgPreview.style.display = "block";
      const promptEl = dropArea.querySelector(".drop-prompt");
      if (promptEl) promptEl.style.display = "none";
      showToast("Image loaded successfully!", "info");
    };
    reader.readAsDataURL(file);
  }

  if (stegoEncodeBtn) {
    stegoEncodeBtn.addEventListener("click", async () => {
      if (!imgPreview.src || imgPreview.style.display === "none") {
        showToast("Please upload an image first.", "error");
        return;
      }
      const secret = stegoText.value.trim();

      try {
        stegoEncodeBtn.disabled = true;
        const encodedDataUrl = await SteganographyEngine.encode(imgPreview.src, secret);
        stegoOutputImg.src = encodedDataUrl;
        document.getElementById("stego-img-result-box").style.display = "block";
        document.getElementById("stego-text-result-box").style.display = "none";
        showToast("Secret message hidden inside image!", "success");
      } catch (err) {
        showToast(err.message, "error");
      } finally {
        stegoEncodeBtn.disabled = false;
      }
    });
  }

  if (stegoDecodeBtn) {
    stegoDecodeBtn.addEventListener("click", async () => {
      if (!imgPreview.src || imgPreview.style.display === "none") {
        showToast("Please upload an image containing a hidden message.", "error");
        return;
      }

      try {
        stegoDecodeBtn.disabled = true;
        const hiddenMessage = await SteganographyEngine.decode(imgPreview.src);
        glitchRevealText(stegoOutputText, hiddenMessage);
        document.getElementById("stego-text-result-box").style.display = "block";
        document.getElementById("stego-img-result-box").style.display = "none";
        showToast("Hidden message extracted successfully!", "success");
      } catch (err) {
        showToast(err.message, "error");
      } finally {
        stegoDecodeBtn.disabled = false;
      }
    });
  }

  const downloadStegoBtn = document.getElementById("download-stego-img");
  if (downloadStegoBtn) {
    downloadStegoBtn.addEventListener("click", () => {
      if (stegoOutputImg.src) {
        const link = document.createElement("a");
        link.download = "msg-secure-secret-image.png";
        link.href = stegoOutputImg.src;
        link.click();
        showToast("Stego image downloaded!", "success");
      }
    });
  }

  const stegoCopyBtn = document.getElementById("stego-copy-btn");
  if (stegoCopyBtn && stegoOutputText) {
    stegoCopyBtn.addEventListener("click", () => {
      if (!stegoOutputText.value) {
        showToast("Nothing to copy!", "error");
        return;
      }
      navigator.clipboard.writeText(stegoOutputText.value);
      showToast("Copied to clipboard!", "success");
    });
  }
}

/* ==========================================================================
   5. Cryptographic Password Generator
   ========================================================================== */
function initKeyGenerator() {
  const lenSlider = document.getElementById("gen-length");
  const lenVal = document.getElementById("gen-length-val");
  const generateBtn = document.getElementById("gen-key-btn");
  const keyDisplay = document.getElementById("gen-key-output");

  if (lenSlider && lenVal) {
    lenSlider.addEventListener("input", () => {
      lenVal.textContent = lenSlider.value;
    });
  }

  if (generateBtn) {
    generateBtn.addEventListener("click", () => {
      const length = parseInt(lenSlider.value) || 24;
      const useUpper = document.getElementById("gen-upper").checked;
      const useLower = document.getElementById("gen-lower").checked;
      const useNums = document.getElementById("gen-nums").checked;
      const useSyms = document.getElementById("gen-syms").checked;

      let charset = "";
      if (useUpper) charset += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      if (useLower) charset += "abcdefghijklmnopqrstuvwxyz";
      if (useNums) charset += "0123456789";
      if (useSyms) charset += "!@#$%^&*()_+-=[]{}|;:,.<>?";

      if (!charset) {
        showToast("Please select at least one character type.", "error");
        return;
      }

      const randomValues = new Uint32Array(length);
      window.crypto.getRandomValues(randomValues);

      let key = "";
      for (let i = 0; i < length; i++) {
        key += charset[randomValues[i] % charset.length];
      }

      keyDisplay.value = key;
      showToast("Ultra-secure key generated!", "success");
    });
  }

  const genKeyCopyBtn = document.getElementById("gen-key-copy-btn");
  if (genKeyCopyBtn && keyDisplay) {
    genKeyCopyBtn.addEventListener("click", () => {
      if (!keyDisplay.value) {
        showToast("Generate a key first!", "error");
        return;
      }
      navigator.clipboard.writeText(keyDisplay.value);
      showToast("Generated key copied to clipboard!", "success");
    });
  }
}

/* ==========================================================================
   6. Binaural Beats & Brainwave Studio Handler
   ========================================================================== */
function initBinauralStudio() {
  visualizer = new AudioVisualizer("binaural-visualizer");

  const playBtn = document.getElementById("binaural-play-btn");
  const playIcon = document.getElementById("binaural-play-icon");
  const playText = document.getElementById("binaural-play-text");

  const carrierSlider = document.getElementById("carrier-slider");
  const carrierVal = document.getElementById("carrier-val");
  const beatSlider = document.getElementById("beat-slider");
  const beatVal = document.getElementById("beat-val");

  const waveformSelect = document.getElementById("waveform-select");
  const masterVolSlider = document.getElementById("master-vol-slider");
  const masterVolVal = document.getElementById("master-vol-val");

  const pinkVolSlider = document.getElementById("pink-vol-slider");
  const pinkVolVal = document.getElementById("pink-vol-val");
  const brownVolSlider = document.getElementById("brown-vol-slider");
  const brownVolVal = document.getElementById("brown-vol-val");

  const timerSelect = document.getElementById("timer-select");
  const timerCountdown = document.getElementById("timer-countdown");

  const presetCards = document.querySelectorAll(".preset-card");

  // Play / Stop Toggle
  if (playBtn) {
    playBtn.addEventListener("click", () => {
      if (binaural.isPlaying) {
        binaural.stop();
        if (visualizer) visualizer.stop();
        playBtn.classList.remove("playing");
        playIcon.textContent = "▶";
        playText.textContent = "Start Sound";
        showToast("Binaural Beats Stopped", "info");
      } else {
        binaural.start();
        if (visualizer && binaural.analyser) visualizer.start(binaural.analyser);
        playBtn.classList.add("playing");
        playIcon.textContent = "⏸";
        playText.textContent = "Pause Sound";
        showToast("Binaural Beats Playing! Use headphones for stereo effect.", "success");
      }
    });
  }

  // Preset Card Clicks
  presetCards.forEach((card) => {
    card.addEventListener("click", () => {
      presetCards.forEach((c) => c.classList.remove("active"));
      card.classList.add("active");

      const carrier = parseFloat(card.dataset.carrier);
      const beat = parseFloat(card.dataset.beat);
      const presetName = card.dataset.preset;

      carrierSlider.value = carrier;
      carrierVal.textContent = carrier;

      beatSlider.value = beat;
      beatVal.textContent = beat.toFixed(1);

      binaural.setFrequencies(carrier, beat);
      showToast(`${presetName.toUpperCase()} Waves Selected (${beat} Hz)`, "info");
    });
  });

  // Carrier Pitch Slider
  if (carrierSlider) {
    carrierSlider.addEventListener("input", () => {
      const carrier = carrierSlider.value;
      carrierVal.textContent = carrier;
      binaural.setFrequencies(carrier, beatSlider.value);
    });
  }

  // Beat Offset Slider
  if (beatSlider) {
    beatSlider.addEventListener("input", () => {
      const beat = parseFloat(beatSlider.value);
      beatVal.textContent = beat.toFixed(1);
      binaural.setFrequencies(carrierSlider.value, beat);
    });
  }

  // Waveform Selector
  if (waveformSelect) {
    waveformSelect.addEventListener("change", () => {
      binaural.setWaveform(waveformSelect.value);
    });
  }

  // Master Volume Slider
  if (masterVolSlider) {
    masterVolSlider.addEventListener("input", () => {
      const volPercent = masterVolSlider.value;
      masterVolVal.textContent = volPercent;
      binaural.setMasterVolume(volPercent / 100);
    });
  }

  // Ambient Pink Noise (Rain) Slider
  if (pinkVolSlider) {
    pinkVolSlider.addEventListener("input", () => {
      const volPercent = pinkVolSlider.value;
      pinkVolVal.textContent = volPercent;
      binaural.setAmbientVolume("pink", (volPercent / 100) * 0.4);
    });
  }

  // Ambient Brown Noise (Ocean) Slider
  if (brownVolSlider) {
    brownVolSlider.addEventListener("input", () => {
      const volPercent = brownVolSlider.value;
      brownVolVal.textContent = volPercent;
      binaural.setAmbientVolume("brown", (volPercent / 100) * 0.4);
    });
  }

  // Session Timer Selector
  if (timerSelect) {
    timerSelect.addEventListener("change", () => {
      const minutes = parseInt(timerSelect.value) || 0;
      if (minutes > 0) {
        timerCountdown.style.display = "block";
        binaural.startTimer(
          minutes,
          (secs) => {
            const m = Math.floor(secs / 60);
            const s = secs % 60;
            timerCountdown.textContent = `⏱️ Session Timer: ${m}:${s < 10 ? "0" : ""}${s} remaining`;
          },
          () => {
            timerCountdown.style.display = "none";
            if (playBtn) {
              playBtn.classList.remove("playing");
              playIcon.textContent = "▶";
              playText.textContent = "Start Sound";
            }
            if (visualizer) visualizer.stop();
            showToast("Sleep timer completed. Audio stopped.", "info");
          }
        );
        showToast(`Timer set for ${minutes} minutes`, "info");
      } else {
        binaural.stopTimer();
        timerCountdown.style.display = "none";
      }
    });
  }
}

/* ==========================================================================
   7. Matrix Glitch Text Decrypt Effect
   ========================================================================== */
function glitchRevealText(element, finalString) {
  const glyphs = "!@#$%^&*()_+-=[]{}|;:,.<>?/10XyZ";
  let iterations = 0;
  const maxIterations = 12;

  const interval = setInterval(() => {
    element.value = finalString
      .split("")
      .map((char, index) => {
        if (char === "\n" || char === " ") return char;
        if (index < (iterations / maxIterations) * finalString.length) {
          return finalString[index];
        }
        return glyphs[Math.floor(Math.random() * glyphs.length)];
      })
      .join("");

    iterations++;
    if (iterations > maxIterations) {
      clearInterval(interval);
      element.value = finalString;
    }
  }, 35);
}

/* ==========================================================================
   8. Password Strength Evaluator
   ========================================================================== */
function evaluatePasswordStrength(pass) {
  if (!pass) return 0;
  let score = 0;
  if (pass.length >= 8) score += 25;
  if (pass.length >= 14) score += 25;
  if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 20;
  if (/[0-9]/.test(pass)) score += 15;
  if (/[^A-Za-z0-9]/.test(pass)) score += 15;
  return Math.min(score, 100);
}

function updateStrengthUI(score) {
  const bar = document.getElementById("pass-strength-bar");
  const label = document.getElementById("pass-strength-text");
  if (!bar || !label) return;

  bar.style.width = `${score}%`;

  if (score === 0) {
    bar.style.backgroundColor = "transparent";
    label.textContent = "Passphrase Strength";
    label.style.color = "#8f9cae";
  } else if (score < 40) {
    bar.style.backgroundColor = "#ff4757";
    label.textContent = "Weak Passphrase";
    label.style.color = "#ff4757";
  } else if (score < 75) {
    bar.style.backgroundColor = "#ffa502";
    label.textContent = "Moderate Passphrase";
    label.style.color = "#ffa502";
  } else {
    bar.style.backgroundColor = "#2ed573";
    label.textContent = "Strong Passphrase (AES-256 Standard)";
    label.style.color = "#2ed573";
  }
}

/* ==========================================================================
   9. Output Utility Actions (Copy, Download)
   ========================================================================== */
function setupOutputActions(prefix) {
  const outputEl = document.getElementById(`${prefix}-output`);
  const copyBtn = document.getElementById(`${prefix}-copy-btn`);
  const downloadBtn = document.getElementById(`${prefix}-download-btn`);

  if (copyBtn && outputEl) {
    copyBtn.addEventListener("click", () => {
      if (!outputEl.value) {
        showToast("Nothing to copy!", "error");
        return;
      }
      navigator.clipboard.writeText(outputEl.value);
      showToast("Copied to clipboard!", "success");
    });
  }

  if (downloadBtn && outputEl) {
    downloadBtn.addEventListener("click", () => {
      if (!outputEl.value) {
        showToast("Output is empty!", "error");
        return;
      }
      const blob = new Blob([outputEl.value], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `msg-secure-${prefix}-result.txt`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("File downloaded!", "success");
    });
  }
}

/* ==========================================================================
   10. URL Hash Payload Auto-Detector
   ========================================================================== */
function checkURLPayload() {
  const hash = window.location.hash;
  if (hash && hash.includes("payload=")) {
    const payload = decodeURIComponent(hash.split("payload=")[1]);
    const aesInput = document.getElementById("aes-input");
    const aesPass = document.getElementById("aes-pass");

    if (aesInput) {
      aesInput.value = payload;
      showToast("Encrypted link payload loaded! Enter passphrase to decrypt.", "info");

      const aesTabBtn = document.querySelector('[data-tab="tab-aes"]');
      if (aesTabBtn) aesTabBtn.click();

      if (aesPass) aesPass.focus();
    }
  }
}

/* ==========================================================================
   11. Toast Notification System
   ========================================================================== */
function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;

  const iconMap = {
    success: "✓",
    error: "✕",
    info: "ℹ"
  };

  toast.innerHTML = `
    <span class="toast-icon">${iconMap[type] || "ℹ"}</span>
    <span class="toast-msg">${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => toast.classList.add("show"), 10);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
