/* ====================================================================
 * audio.js
 * 用 Web Audio 合成"机械键盘咔哒"音 —— 零素材、零文件
 * 音色构成：
 *   - 一段 ~25ms 的衰减噪声 → 主体的"塑料感"咔哒声
 *   - 一个 ~5ms 的高频方波 →  让起音更脆
 * 暴露：window.LB_audio.click()  / window.LB_audio.setMuted(bool)
 * 默认静音；首次点击或按键后由 boss-key.js 触发 setMuted(false)。
 * ==================================================================== */

(function () {
  var muted = true;
  var ctx = null;

  function ensureCtx() {
    if (ctx) return ctx;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    return ctx;
  }

  // 用现成的 25ms 噪声 buffer 反复用，避免每次 createBuffer
  var noiseBuf = null;
  function getNoise() {
    if (!ctx) return null;
    if (noiseBuf) return noiseBuf;
    var len = Math.floor(ctx.sampleRate * 0.025); // 25ms
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    var data = noiseBuf.getChannelData(0);
    for (var i = 0; i < len; i++) {
      // 加一个指数衰减包络，前 1ms 最响，后面快速衰
      var env = Math.exp(-i / (len * 0.18));
      data[i] = (Math.random() * 2 - 1) * env;
    }
    return noiseBuf;
  }

  function click() {
    if (muted) return;
    if (!ensureCtx()) return;

    var t = ctx.currentTime;

    // ---- 噪声部分（咔哒主体） ----
    var src = ctx.createBufferSource();
    src.buffer = getNoise();
    var bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1800 + Math.random() * 1200; // 每次抖动音色
    bp.Q.value = 1.2;
    var ng = ctx.createGain();
    ng.gain.value = 0.18;
    src.connect(bp); bp.connect(ng); ng.connect(ctx.destination);
    src.start(t);
    src.stop(t + 0.04);

    // ---- 起音方波（让"咔"更脆） ----
    var osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = 1400 + Math.random() * 400;
    var og = ctx.createGain();
    og.gain.setValueAtTime(0.0, t);
    og.gain.linearRampToValueAtTime(0.04, t + 0.001);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.012);
    osc.connect(og); og.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.02);
  }

  function setMuted(b) {
    muted = !!b;
    if (!muted) {
      // 用户首次允许声音 → 触发 ctx 创建 + resume（解决浏览器 autoplay 限制）
      var c = ensureCtx();
      if (c && c.state === 'suspended') c.resume();
    }
    var btn = document.getElementById('muteBtn');
    if (btn) {
      btn.textContent = muted ? '🔇 SOUND OFF' : '🔊 SOUND ON';
      btn.classList.toggle('on', !muted);
    }
  }

  // 静音按钮
  document.addEventListener('DOMContentLoaded', function(){
    var btn = document.getElementById('muteBtn');
    if (btn) btn.addEventListener('click', function(){ setMuted(!muted); });
  });

  window.LB_audio = { click: click, setMuted: setMuted, isMuted: function(){return muted;} };
})();
