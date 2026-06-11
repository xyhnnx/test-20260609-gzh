/* ====================================================================
 * log-stream.js — 项目"大脑"
 * 1. 维护一份全局训练状态（step / epoch / loss / acc / lr）
 * 2. 每 tick 根据 PyTorch/HF 真实日志模板生成一行新日志
 * 3. 同步把 loss/acc 喂给 SVG 图表、step/epoch/lr 喂给进度面板
 * 4. 每追加一行就触发一次 LB_audio.click()，让你听起来在猛敲键盘
 * loss 曲线公式（让它"像真在收敛"）：
 *   loss = 0.85 * exp(-step/9000) + 0.06 * sin(step/350) + 0.04 + noise
 *   acc  = 1 - loss * (0.85 + 0.1*sin(step/600)) + noise
 * ==================================================================== */

(function () {
  var logEl = document.getElementById('log');
  if (!logEl) return;

  // ---------------- 状态 ----------------
  var state = {
    step: 0,
    totalStep: 100000,
    epoch: 0,
    totalEpoch: 100,
    stepsPerEpoch: 1000,
    lr: 3.0e-4,
    loss: 0.85,
    acc: 0.05
  };

  // 真实风格的日志模板。{X} 占位由 render 时填
  // 等级权重：info 多、debug 偶尔、warn 偶尔、err 极少、ok 偶尔
  var TEMPLATES = [
    { w:14, lv:'info', t:'[INFO] [{TS}] step {STEP}/{TOTAL_STEP} | loss={LOSS} | lr={LR} | gpu_mem={MEM}GB | throughput={TPS} tokens/s' },
    { w:6,  lv:'info', t:'[INFO] [{TS}] epoch {EPOCH}/{TOTAL_EPOCH} | val_loss={LOSS_V} | val_acc={ACC_V}' },
    { w:5,  lv:'debug',t:'[DEBUG] forward t={F}ms · backward t={B}ms · optim t={O}ms · all_reduce t={R}ms' },
    { w:5,  lv:'debug',t:'[DEBUG] activation memory peak: {MEM2}MB (layer transformer.h.{LAYER})' },
    { w:4,  lv:'info', t:'[INFO] grad_norm={GN}  ·  param_norm={PN}  ·  cosine_sim={CS}' },
    { w:3,  lv:'info', t:'[INFO] DataLoader: prefetched {PF} batches · queue={QS}/16' },
    { w:3,  lv:'warn', t:'[WARN] grad scale = {GS}, decreasing to avoid NaN (next try in 2 steps)' },
    { w:2,  lv:'warn', t:'[WARN] NaN/Inf detected at transformer.h.{LAYER}.attn.qkv -> skipping step' },
    { w:2,  lv:'warn', t:'[WARN] node-3 NCCL all_reduce latency = {LAT}ms (p99), threshold 200ms' },
    { w:1,  lv:'err',  t:'[ERROR] CUDA out of memory on gpu:{G} (tried to allocate {OOM}MB) — falling back to recompute' },
    { w:3,  lv:'ok',   t:'[CKPT] saved ./runs/exp_{EXP}/epoch_{EPOCH}_step_{STEP}.pt  ({CKPT_SIZE}GB)' },
    { w:2,  lv:'ok',   t:'[EVAL] passed safety eval suite (toxicity={TOX}, bias_score={BIAS}, refusal={REF})' },
    { w:2,  lv:'info', t:'[INFO] [wandb] uploaded chart: train/loss train/acc lr grad_norm  · run_id=mn-{RID}' },
    { w:1,  lv:'info', t:'[INFO] router: expert_load_balance_loss={LBL}, dropped_tokens={DT}' },
    { w:2,  lv:'info', t:'[INFO] tokens consumed so far: {TOK}B / 1500B  ({TOKPCT}%)' },
    { w:1,  lv:'debug',t:'[DEBUG] flashattn_v3 enabled · seq_len={SEQ} · fp8_matmul=on · ulysses_sp={SP}' }
  ];

  // 偶发"庆祝"行：训练里程碑
  var MILESTONES = [
    "[ 🎉 ] reached new best val_loss = {LOSS_V} · pushing checkpoint to remote",
    "[ 🎉 ] crossed 100K tokens/s throughput milestone",
    "[ 🎉 ] epoch {EPOCH} finished without NaN — celebrating with extra log line"
  ];

  // ---------------- 辅助 ----------------
  var totalW = 0;
  TEMPLATES.forEach(function(t){ totalW += t.w; });

  function pickTpl() {
    var r = Math.random() * totalW;
    for (var i = 0; i < TEMPLATES.length; i++) {
      r -= TEMPLATES[i].w;
      if (r <= 0) return TEMPLATES[i];
    }
    return TEMPLATES[0];
  }

  function pad2(n){ return (n<10?'0':'')+n; }
  function nowTs() {
    var d = new Date();
    return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate())+
           ' '+pad2(d.getHours())+':'+pad2(d.getMinutes())+':'+pad2(d.getSeconds());
  }

  function fill(tpl) {
    return tpl
      .replace('{TS}',           nowTs())
      .replace('{STEP}',         state.step)
      .replace('{TOTAL_STEP}',   state.totalStep)
      .replace('{EPOCH}',        state.epoch)
      .replace('{TOTAL_EPOCH}',  state.totalEpoch)
      .replace('{LOSS}',         state.loss.toFixed(4))
      .replace('{LOSS_V}',       (state.loss * (0.92 + Math.random()*0.1)).toFixed(4))
      .replace('{ACC_V}',        (state.acc * (0.95 + Math.random()*0.08)).toFixed(4))
      .replace('{LR}',           state.lr.toExponential(2))
      .replace('{MEM}',          (62 + Math.random()*16).toFixed(1))
      .replace('{MEM2}',         (4000 + (Math.random()*1800)|0))
      .replace('{TPS}',          ((11000 + Math.random()*4000)|0).toLocaleString())
      .replace('{F}',            (380 + (Math.random()*60)|0))
      .replace('{B}',            (520 + (Math.random()*80)|0))
      .replace('{O}',            (40 + (Math.random()*20)|0))
      .replace('{R}',            (60 + (Math.random()*40)|0))
      .replace('{GN}',           (0.4 + Math.random()*0.9).toFixed(3))
      .replace('{PN}',           (320 + Math.random()*40).toFixed(2))
      .replace('{CS}',           (0.85 + Math.random()*0.1).toFixed(4))
      .replace('{PF}',           (2 + (Math.random()*6)|0))
      .replace('{QS}',           (8 + (Math.random()*8)|0))
      .replace('{GS}',           (1 << (10 + (Math.random()*5)|0)).toString())
      .replace('{LAYER}',        (Math.random()*64)|0)
      .replace('{LAT}',          (180 + (Math.random()*80)|0))
      .replace('{G}',            (Math.random()*4)|0)
      .replace('{OOM}',          ((Math.random()*900+200)|0))
      .replace('{EXP}',          '2026_06_10_run')
      .replace('{CKPT_SIZE}',    (58 + (Math.random()*4)).toFixed(1))
      .replace('{TOX}',          (Math.random()*0.02).toFixed(4))
      .replace('{BIAS}',         (Math.random()*0.05).toFixed(4))
      .replace('{REF}',          (0.95 + Math.random()*0.04).toFixed(4))
      .replace('{RID}',          (Math.random().toString(36).slice(2,8)))
      .replace('{LBL}',          (Math.random()*0.05).toFixed(5))
      .replace('{DT}',           ((Math.random()*200)|0))
      .replace('{TOK}',          ((state.step / state.totalStep * 1500) + Math.random()).toFixed(2))
      .replace('{TOKPCT}',       ((state.step / state.totalStep * 100)).toFixed(2))
      .replace('{SEQ}',          (8192))
      .replace('{SP}',           (8));
  }

  function colorize(line) {
    // 给数字、时间戳上色
    return line
      .replace(/(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/g, '<span class="ts">$1</span>')
      .replace(/(\d+(?:\.\d+)?(?:e[-+]?\d+)?)/g, '<span class="num">$1</span>');
  }

  function appendLine(text, lv) {
    var div = document.createElement('div');
    div.className = 'line lv-' + lv;
    div.innerHTML = colorize(text);
    logEl.appendChild(div);

    // 控制 DOM 节点数，超过 200 行裁掉前面
    while (logEl.childElementCount > 200) logEl.removeChild(logEl.firstChild);
    // 自动滚到底
    logEl.scrollTop = logEl.scrollHeight;

    // 每行日志 = 一次"咔哒"
    if (window.LB_audio) window.LB_audio.click();
  }

  // ---------------- 主循环 ----------------
  function step() {
    state.step += 1 + ((Math.random()*3)|0); // 每 tick 步进 1-3 step（让数字跳得快）
    if (state.step > state.totalStep) state.step = state.totalStep;
    state.epoch = Math.min(state.totalEpoch, (state.step / state.stepsPerEpoch) | 0);

    // loss / acc 计算
    var noise = (Math.random() - 0.5) * 0.02;
    state.loss = Math.max(0.02,
      0.85 * Math.exp(-state.step / 9000)
      + 0.06 * Math.sin(state.step / 350)
      + 0.04 + noise);
    state.acc = Math.max(0.01, Math.min(0.99,
      1 - state.loss * (0.85 + 0.1 * Math.sin(state.step / 600)) + (Math.random()-0.5)*0.01));

    // LR cosine 衰减
    state.lr = 3.0e-4 * (0.5 * (1 + Math.cos(Math.PI * state.step / state.totalStep)));

    // 生成日志
    var tpl = pickTpl();
    appendLine(fill(tpl.t), tpl.lv);

    // 偶尔丢一个"里程碑"
    if (Math.random() < 0.01) {
      var m = MILESTONES[(Math.random()*MILESTONES.length)|0];
      setTimeout(function(){ appendLine(fill(m), 'ok'); }, 200);
    }

    // 喂图表和进度面板
    if (window.LB_chart)    window.LB_chart.push(state.step, state.loss, state.acc);
    if (window.LB_progress) window.LB_progress.tick(state);

    // 下一次：80-280ms 随机间隔，模拟"日志阵发"
    setTimeout(step, 80 + Math.random() * 200);
  }

  // 启动前先吐几行"启动序列"，让画面更真实
  function bootstrap() {
    var seq = [
      ['[INFO] launching torchrun --nproc-per-node=8 --nnodes=4 train.py …', 'info'],
      ['[INFO] world_size=32 · global_rank=0 · local_rank=0', 'info'],
      ['[INFO] loading dataset shards: 1024/1024  · seed=42', 'info'],
      ['[INFO] model = MoonLight-32B-v0.7 (32.7B params, 56 layers, dim=8192)', 'info'],
      ['[INFO] dtype=bf16 · zero-3 · flashattn-v3 · gradient_checkpointing=true', 'info'],
      ['[INFO] resuming from checkpoint ./runs/exp_2026_06_10_run/last.pt … done.', 'ok'],
      ['[INFO] starting training loop. estimated wall time: 13h 42m', 'info']
    ];
    var i = 0;
    function next() {
      if (i >= seq.length) { step(); return; }
      appendLine(seq[i][0], seq[i][1]);
      i++;
      setTimeout(next, 250);
    }
    next();
  }

  // 等 DOM 与其它脚本就位
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
})();
