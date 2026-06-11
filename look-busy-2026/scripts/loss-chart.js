/* ====================================================================
 * loss-chart.js
 * SVG 实时双曲线：
 *   - loss: 衰减 + 抖动（向 0 收敛）
 *   - acc:  逐步上升 + 抖动（向 1 收敛）
 * 滚动窗口 200 点；y 轴 0..1 固定（loss/acc 都归一化好）
 * 由 log-stream.js 调用 window.LB_chart.push(step, loss, acc)
 * ==================================================================== */

(function () {
  var svg = document.getElementById('lossChart');
  if (!svg) return;

  var NS = 'http://www.w3.org/2000/svg';
  var W = 600, H = 220;
  var PAD_L = 28, PAD_R = 6, PAD_T = 8, PAD_B = 16;
  var IW = W - PAD_L - PAD_R;
  var IH = H - PAD_T - PAD_B;
  var WIN = 200;

  var data = []; // {step, loss, acc}

  // 网格 + y 轴标签
  for (var i = 0; i <= 4; i++) {
    var y = PAD_T + (IH / 4) * i;
    var line = document.createElementNS(NS, 'line');
    line.setAttribute('class','axis');
    line.setAttribute('x1', PAD_L); line.setAttribute('x2', W - PAD_R);
    line.setAttribute('y1', y); line.setAttribute('y2', y);
    svg.appendChild(line);

    var t = document.createElementNS(NS, 'text');
    t.setAttribute('class','grid-text');
    t.setAttribute('x', 2); t.setAttribute('y', y + 3);
    t.textContent = (1 - i*0.25).toFixed(2);
    svg.appendChild(t);
  }

  var pathLoss = document.createElementNS(NS,'path');
  pathLoss.setAttribute('class','path-loss');
  svg.appendChild(pathLoss);

  var pathAcc = document.createElementNS(NS,'path');
  pathAcc.setAttribute('class','path-acc');
  svg.appendChild(pathAcc);

  // 游标虚线 + 当前值
  var cursor = document.createElementNS(NS,'line');
  cursor.setAttribute('class','cursor-line');
  cursor.setAttribute('y1', PAD_T); cursor.setAttribute('y2', H - PAD_B);
  svg.appendChild(cursor);

  var curText = document.getElementById('curLoss');

  function build(key) {
    // 把 data 映射成 SVG path d
    if (data.length < 2) return '';
    var d = '';
    var n = data.length;
    var startIdx = Math.max(0, n - WIN);
    var span = Math.min(WIN, n - 1) || 1;
    for (var i = startIdx; i < n; i++) {
      var rel = (i - startIdx) / span;
      var x = PAD_L + rel * IW;
      var v = data[i][key];           // 0..1
      var y = PAD_T + (1 - v) * IH;   // 高值在上
      d += (i === startIdx ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1) + ' ';
    }
    return d;
  }

  function render() {
    pathLoss.setAttribute('d', build('loss'));
    pathAcc.setAttribute('d',  build('acc'));
    if (data.length) {
      var last = data[data.length - 1];
      curText.textContent = 'step ' + last.step
        + ' · loss=' + last.loss.toFixed(4)
        + ' · acc=' + (last.acc * 100).toFixed(2) + '%';
      cursor.setAttribute('x1', W - PAD_R);
      cursor.setAttribute('x2', W - PAD_R);
    }
  }

  function push(step, loss, acc) {
    data.push({ step: step, loss: Math.max(0, Math.min(1, loss)), acc: Math.max(0, Math.min(1, acc)) });
    if (data.length > WIN + 50) data.splice(0, data.length - (WIN + 50));
    render();
  }

  window.LB_chart = { push: push };
})();
