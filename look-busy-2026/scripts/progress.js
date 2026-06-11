/* ====================================================================
 * progress.js
 * 右下角进度面板：epoch / step 进度条 + 4 卡 GPU 显存 + ETA / LR
 * 由 log-stream.js 每 tick 调 window.LB_progress.tick(state)
 * ==================================================================== */

(function () {
  // ---- 4 张 GPU 卡（自动渲染到 #gpuList） ----
  var GPU_LIST = ['gpu:0','gpu:1','gpu:2','gpu:3'];
  var TOTAL_MEM = 81920; // 80GB ≈ A100 80G

  var gpuRows = [];
  var listEl = document.getElementById('gpuList');
  if (listEl) {
    GPU_LIST.forEach(function(name){
      var row = document.createElement('div');
      row.className = 'gpu-row';
      row.innerHTML =
        '<span class="gpu-name">'+ name +'</span>' +
        '<span class="gpu-meter"><span class="gpu-meter-fill"></span></span>' +
        '<span class="gpu-val">— / — MB</span>';
      listEl.appendChild(row);
      gpuRows.push({
        fill: row.querySelector('.gpu-meter-fill'),
        val:  row.querySelector('.gpu-val'),
        baseUsage: 0.78 + Math.random() * 0.18 // 78%-96% 基础占用
      });
    });
  }

  var epochValEl = document.getElementById('epochVal');
  var epochFillEl = document.getElementById('epochFill');
  var stepValEl = document.getElementById('stepVal');
  var stepFillEl = document.getElementById('stepFill');
  var etaValEl = document.getElementById('etaVal');
  var lrValEl = document.getElementById('lrVal');

  function fmtETA(sec) {
    sec = Math.max(0, sec | 0);
    var h = (sec / 3600) | 0;
    var m = ((sec % 3600) / 60) | 0;
    var s = sec % 60;
    return (h<10?'0':'')+h+':'+(m<10?'0':'')+m+':'+(s<10?'0':'')+s;
  }

  function tick(state) {
    // state: {epoch, totalEpoch, step, totalStep, lr}
    if (epochValEl) epochValEl.textContent = state.epoch + ' / ' + state.totalEpoch;
    if (stepValEl)  stepValEl.textContent  = state.step + ' / ' + state.totalStep;
    if (epochFillEl) epochFillEl.style.width = (state.epoch / state.totalEpoch * 100).toFixed(2) + '%';
    if (stepFillEl)  stepFillEl.style.width  = (state.step  / state.totalStep  * 100).toFixed(2) + '%';
    if (lrValEl) lrValEl.textContent = state.lr.toExponential(2);

    // ETA: 假装根据进度估剩余时间，但每次微抖让它"动起来"
    var prog = state.step / state.totalStep;
    var fakeTotal = 14 * 3600; // 14h
    var eta = fakeTotal * (1 - prog) - Math.random() * 5;
    if (etaValEl) etaValEl.textContent = fmtETA(eta);

    // GPU 显存：基础占用 ± 50MB 抖动
    gpuRows.forEach(function(row){
      var jitter = (Math.random() - 0.5) * 0.02;
      var pct = Math.max(0.7, Math.min(0.99, row.baseUsage + jitter));
      var used = Math.floor(pct * TOTAL_MEM);
      row.fill.style.width = (pct * 100).toFixed(1) + '%';
      row.fill.classList.toggle('hot', pct > 0.93);
      row.val.textContent = used.toLocaleString() + ' / ' + TOTAL_MEM.toLocaleString() + ' MB';
    });
  }

  window.LB_progress = { tick: tick };
})();
