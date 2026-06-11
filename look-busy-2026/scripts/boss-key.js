/* ====================================================================
 * boss-key.js — 老板键状态机
 * 触发方式：
 *   1. 按 ` (反引号) 切换
 *   2. 按 Esc 直接切到 boss 态（紧急避险）
 *   3. 鼠标移到屏幕右上角 50x50 px 区域，触发 boss 态
 * 注意：切换时不停止训练循环，只是 display:none，所以"老板走了切回来"
 *       loss 还在继续往前跑，更可信。
 * 第一次用户交互（任意键 / 点击）后自动解除静音（绕过 autoplay policy）。
 * ==================================================================== */

(function () {
  var busy = document.getElementById('busyMode');
  var boss = document.getElementById('bossMode');
  if (!busy || !boss) return;

  var inBoss = false;
  function setBoss(b) {
    inBoss = b;
    if (b) {
      boss.hidden = false;
      busy.style.display = 'none';
      document.title = '微服务架构演进指南 v3.2 — 公司内部文档';
    } else {
      boss.hidden = true;
      busy.style.display = '';
      document.title = 'train.py · Cluster-A100 · run-2026.06.10';
    }
  }
  function toggle() { setBoss(!inBoss); }

  // 键盘监听
  document.addEventListener('keydown', function(e){
    if (e.key === '`' || e.code === 'Backquote') {
      e.preventDefault();
      toggle();
    } else if (e.key === 'Escape' && !inBoss) {
      setBoss(true);
    }
  });

  // 右上角"鼠标避险区"
  document.addEventListener('mousemove', function(e){
    if (inBoss) return;
    if (e.clientX > window.innerWidth - 50 && e.clientY < 50) {
      setBoss(true);
    }
  });

  // 老板模式下，点页面任意位置切回（更顺手）
  boss.addEventListener('dblclick', function(){ if (inBoss) setBoss(false); });

  // 首次任意交互 → 解除静音（顺带启动 AudioContext）
  var unlocked = false;
  function unlock() {
    if (unlocked) return;
    unlocked = true;
    if (window.LB_audio) window.LB_audio.setMuted(false);
  }
  document.addEventListener('click', unlock, { once: true });
  document.addEventListener('keydown', unlock, { once: true });
})();
