/* ====================================================================
 * matrix-rain.js
 * 经典 Matrix 字符雨。改造点：
 *   1. 字符集混入"训练 / 损失 / 收敛 / 梯度 / 玄学"+ emoji，让"AI 训练"主题更突出
 *   2. 拖尾用 rgba(0,0,0,0.06) 半透明覆盖，而不是 clearRect —— 这样字才会"渐隐"
 *   3. 每列字符各自维护 y 速度 / 长度 / 颜色亮度，避免画面太机械
 * 用法：HTML 里放一个 <canvas id="rain">，本脚本自动接管
 * ==================================================================== */

(function () {
  var canvas = document.getElementById('rain');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');

  var CHARS = (
    '01010101' +
    'abcdefghijklmnopqrstuvwxyz' +
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ' +
    '{}[]()<>=+-*/&^%$#@!?;:,.' +
    '训练损失收敛梯度玄学权重张量反传分布注意力'
  ).split('');
  // emoji 单独一组，每隔一段才出现一次
  var EMOJIS = ['🔥','⚡','🚀','🧠','💧','✨','🌧','🌊','🛰','📡','🪐'];

  var FONT_SIZE = 16;
  var cols, drops;

  function resize() {
    var dpr = window.devicePixelRatio || 1;
    var w = canvas.clientWidth || canvas.parentElement.clientWidth;
    var h = canvas.clientHeight || canvas.parentElement.clientHeight;
    canvas.width  = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr,0,0,dpr,0,0);

    cols = Math.floor(w / FONT_SIZE);
    drops = new Array(cols).fill(0).map(function(){
      return {
        y: Math.random() * -50,           // 起始 y（负数让它从屏幕上方陆续掉下来）
        speed: 0.5 + Math.random() * 1.2, // 每列下落速度不同
        bright: Math.random() < 0.18      // 18% 列为"亮头"风格（白色头 + 绿色尾）
      };
    });
  }

  function pick(arr){ return arr[(Math.random()*arr.length)|0]; }

  function draw() {
    // 半透明黑覆盖 —— 关键技巧：rgba 不是 1.0，旧字符会逐帧变暗形成尾迹
    ctx.fillStyle = 'rgba(0, 0, 0, 0.07)';
    ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);

    ctx.font = FONT_SIZE + "px 'JetBrains Mono', Consolas, monospace";

    for (var i = 0; i < cols; i++) {
      var d = drops[i];
      var x = i * FONT_SIZE;
      var y = d.y * FONT_SIZE;

      // 每 60 列出现一次 emoji
      var ch = (Math.random() < 0.012) ? pick(EMOJIS) : pick(CHARS);

      if (d.bright) {
        ctx.fillStyle = '#ffffff';       // 头部亮白
      } else {
        ctx.fillStyle = '#00ff9c';
      }
      ctx.fillText(ch, x, y);

      // 头部下面再"补"一个略暗的绿，让头亮的列有过渡感
      if (d.bright) {
        ctx.fillStyle = '#7affc0';
        ctx.fillText(pick(CHARS), x, y - FONT_SIZE);
      }

      // 推进
      d.y += d.speed;
      // 到底了重置（加点随机，避免所有列同步）
      if (y > canvas.clientHeight && Math.random() > 0.975) {
        d.y = 0;
        d.speed = 0.5 + Math.random() * 1.2;
        d.bright = Math.random() < 0.18;
      }
    }

    requestAnimationFrame(draw);
  }

  // ResizeObserver 比 window.resize 更可靠（侧栏宽度由 grid 决定）
  if (window.ResizeObserver) {
    new ResizeObserver(resize).observe(canvas.parentElement);
  } else {
    window.addEventListener('resize', resize);
  }
  resize();
  draw();
})();
