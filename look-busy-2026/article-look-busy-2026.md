# 2026 了你还不会 AI？我写了个网页让你「假装在炼AI大模型」，老板都没看出来

朋友们，不知道你们有没有和我一样的焦虑——

2026 都过去一半了，AI 现在卷成什么样心里没数吗？同事张口闭口 RAG、Agent、MCP、强化学习、SFT 后训练，群里一天蹦出十个新名词，每个我都得偷偷去问 ChatGPT 是啥意思。公司今年的 KPI 直接写明白：**"每人每季度至少落地一个 AI 应用"**，落不下来的，年终就靠想象力。

> **不会 AI 的程序员，2026 年是要被工位除名的。**

可是真要学嘛，时间是真没有：白天写需求、改 Bug、看 Cursor 给我蹦的 diff，晚上下班回家洗碗哄娃刷短视频，谁有时间真的去啃 transformer？ 但**"看起来会 AI"是必须的**——必须让老板和同事相信，我**正在炼一个很厉害的大模型**。

那这事 AI 帮不了我，得我自己上。

我用**纯 HTML + CSS + JavaScript**（不引任何框架、不装 npm、双击就跑）写了个全屏网页，打开后整个屏幕就是一个**"AI 大模型训练监控面板"**——Matrix 字符雨在下、PyTorch 风格日志在滚、loss 曲线在缓慢收敛、4 张 A100 显存数字在跳，还能听见机械键盘咔哒咔哒响，全屏黑底绿字 + CRT 扫描线，**比真的训练界面还像真的训练界面**。

老板路过看到我屏幕上一堆看不懂的英文和绿色字符，自动脑补"小邢在炼大模型呢，这小子有两把刷子"；同事路过会问"你这是在跑啥模型？"，我**只要把它叫做"自研 32B MoE"，没人敢追问细节**——因为追问就显得他不懂 AI。

而当老板真的走过来想看代码时，我按一下 <kbd>`</kbd>（反引号），整个屏幕**瞬间切回一个白底黑字的"公司技术文档"页面**——上面写的是《微服务架构演进指南 v3.2》，看起来我刚刚一直在认真做架构调研，**两手都在抓两手都很硬**。

> 这就是 **Look Busy 2026**。
> 一个让你**假装会用 AI、假装会炼大模型**，**实际上在摸鱼**的纯 H5 项目。
> 不会 AI 不可怕，**看起来会 AI** 才是 2026 年的核心竞争力。

---

## 先上效果


> 截图占位 ①：全景——左字符雨 + 中训练日志 + 右 loss 曲线 + GPU 显存
>
> 截图占位 ②：日志区特写——`step 12345/100000 | loss=0.2841 | lr=2.34e-04 | gpu_mem=72.3GB`
>
> 截图占位 ③：老板键切换前 → 切换后（同一个屏幕，秒变"内部技术文档"）

整张页面**黑底绿字**、自带 **CRT 扫描线滤镜**、三栏布局：

- 左栏：Matrix 字符雨，混入"训练 / 损失 / 收敛 / 梯度 / 玄学"这些字
- 中栏：每 100~300ms 追加一行 PyTorch / HuggingFace 风格的日志
- 右栏：上面是 loss / val_acc 双曲线（像 wandb 截图），下面是 Epoch / Step 进度条、4 张 A100 80G 显存条、ETA 倒计时

按一下 <kbd>`</kbd>，瞬间变成下面这样：

> 截图占位 ④：boss 模式，白底黑字"微服务架构演进指南 v3.2"，左侧 10 条目录、右侧严肃正文

再按一下，loss 曲线还在继续往前画——它根本没停过，**老板走了你接着摸**。

---

## 主要功能

- 🟢 **假训练日志**：30+ 条真实日志模板池子，权重采样，看起来"啥都有"
- 📈 **假 loss / acc 曲线**：SVG 双线，滚动窗口 200 点，自带网格、阴影、当前值
- 💧 **Matrix 字符雨**：字符集混了中文和 emoji，氛围拉满
- 🖥️ **多卡 GPU 监控**：4 张 A100 80G，占用率 78%~96% 抖动，有"温度过高"红色态
- ⌨️ **机械键盘音**：Web Audio 现合成，零素材，每行日志一次"咔哒"
- 🚨 **老板键**：<kbd>`</kbd> / <kbd>Esc</kbd> / 鼠标蹭右上角，三种方式触发避险
- 🖤 **CRT 扫描线**：纯 CSS 做的横条纹 + 微闪烁，赛博朋克感拉满
- 🎨 **零依赖**：没有 React、没有 Vue、没有 npm install，双击 HTML 就跑

---

## 技术拆解

整个项目就 6 个 JS 文件、2 个 CSS、1 个 HTML，全部加起来不到 700 行。下面把 4 个最有意思的点拆开讲。

### 1. Matrix 字符雨：拖尾不是 clearRect 做的

经典的"代码雨"效果，看起来很复杂，其实就一个核心技巧——**不要每帧 clearRect，要每帧用半透明黑覆盖**：

```js
function draw() {
  // 关键：rgba 不是 1.0，旧字符会逐帧变暗，自然形成拖尾
  ctx.fillStyle = 'rgba(0, 0, 0, 0.07)';
  ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);

  for (var i = 0; i < cols; i++) {
    var d = drops[i];
    var ch = (Math.random() < 0.012) ? pick(EMOJIS) : pick(CHARS);
    ctx.fillStyle = d.bright ? '#ffffff' : '#00ff9c';
    ctx.fillText(ch, i * FONT_SIZE, d.y * FONT_SIZE);
    d.y += d.speed;
    if (d.y * FONT_SIZE > canvas.clientHeight && Math.random() > 0.975) {
      d.y = 0;
    }
  }
  requestAnimationFrame(draw);
}
```

第一次写的时候我用了 `ctx.clearRect`，结果画面是干净的——没有拖尾。换成 `rgba(0,0,0,0.07)` 立刻就有"上一帧字符还残留着、但在变暗"的效果，**这是 Matrix 字符雨的灵魂**。

字符集我特意混入了几个中文（"训练损失收敛梯度玄学权重张量"）和 emoji（🔥⚡🚀🧠💧），让画面**比纯英文版本更像"AI 公司"**，老板看了脑补效率拉满。

### 2. 假训练日志：loss 公式得让它"像真在收敛"

这一块是项目的"大脑"。要让一个程序员看一眼日志都不觉得假，关键是 **loss 曲线得长得像真的**。

如果你写 `Math.random()`，loss 就在 0~1 之间乱跳——做过训练的人一眼识破。真实的训练 loss 是**先快速下降、然后缓慢收敛、加一点周期性波动**。我用的公式是：

```js
state.loss =
    0.85 * Math.exp(-state.step / 9000)   // 主体：指数衰减，前期下降快后期慢
  + 0.06 * Math.sin(state.step / 350)     // 周期性波动：像 mini-batch 噪声
  + 0.04                                  // 收敛底
  + (Math.random() - 0.5) * 0.02;         // 随机抖动
```

跑起来你会看到 loss 从 0.85 一路下到 0.05 左右、并且**带着真实训练那种"看似下降其实一直在抖"的形状**。`val_acc` 用 `1 - loss * 系数 + 噪声` 反向推，两条线**永远不会同时往同一方向跳**，很难穿帮。

日志模板我写了 30+ 条，权重采样，覆盖了：

```
[INFO] step X/Y | loss=... | lr=... | gpu_mem=... | throughput=... tokens/s
[DEBUG] forward t=...ms · backward t=...ms · optim t=...ms · all_reduce t=...ms
[WARN] grad scale = ..., decreasing to avoid NaN
[WARN] NaN/Inf detected at transformer.h.{N}.attn.qkv -> skipping step
[ERROR] CUDA out of memory on gpu:{G} -> falling back to recompute
[CKPT] saved ./runs/exp_2026_06_10_run/epoch_{E}_step_{S}.pt ({X}GB)
[ 🎉 ] reached new best val_loss = ... · pushing checkpoint to remote
```

关键是要有 `[WARN]` 和 `[ERROR]`——**没有报错的训练不像真训练**。

### 3. Web Audio 合成机械键盘音：零素材，0 个 mp3

很多桌面挂件 demo 都会加机械键盘音，但 99% 都是引一个 mp3。我**坚持不引素材**，所以全用 Web Audio 现场合成。一次"咔哒"=**一段 25ms 的衰减白噪 + 一个 5ms 的方波起音**：

```js
// 噪声主体（"塑料感"咔哒）
var src = ctx.createBufferSource();
src.buffer = getNoise();           // 25ms 指数衰减白噪
var bp = ctx.createBiquadFilter();
bp.type = 'bandpass';
bp.frequency.value = 1800 + Math.random() * 1200; // 每次都不一样
src.connect(bp).connect(gain).connect(ctx.destination);
src.start(t); src.stop(t + 0.04);

// 起音方波（"脆"的高频咔）
var osc = ctx.createOscillator();
osc.type = 'square';
osc.frequency.value = 1400 + Math.random() * 400;
osc.start(t); osc.stop(t + 0.02);
```

每次的 bandpass 中心频率和方波频率都随机抖动 ±400Hz，这样**每下"咔哒"听起来都不一样**，就像真键盘按到不同键。

⚠️ **踩坑提醒**：Chrome 的 autoplay policy 不允许页面加载就放声，必须在用户首次点击或按键**之后**调 `audioContext.resume()`。我在 `boss-key.js` 里挂了一次性的 `click` / `keydown` 监听处理这件事。如果你打开页面没声音，**点一下页面就有了**。

### 4. 老板键：display:none 的优雅与残忍

老板键的实现简单到尴尬——就是一个 `display:none`：

```js
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

document.addEventListener('keydown', function(e){
  if (e.key === '`' || e.code === 'Backquote') { e.preventDefault(); toggle(); }
  else if (e.key === 'Escape' && !inBoss) { setBoss(true); } // 紧急避险
});

// 鼠标蹭到屏幕右上角 50x50 区域 → 避险
document.addEventListener('mousemove', function(e){
  if (!inBoss && e.clientX > innerWidth-50 && e.clientY < 50) setBoss(true);
});
```

但有两个细节是它好用的关键：

1. **训练循环不暂停**——boss 态只是隐藏 DOM，背后 loss 还在跑、step 还在涨。老板走了切回来，曲线已经又前进了一截，**这才像真训练，谁的训练会因为有人路过就停了**。
2. **三种触发方式都要**：`` ` `` 是日常操作；`Esc` 是手抖时的紧急按钮；鼠标右上角是手离开键盘只在鼠标上时的兜底。**老板出现的时候你根本没有反应时间挑哪个**。

另外 `document.title` 也换掉了，万一老板瞅到浏览器标签页"train.py · Cluster-A100"也算暴露——切到 boss 态时同步把标签页改成"微服务架构演进指南 v3.2"。这种细节，**做了别人看不出来，没做暴露你一辈子**。

---

## 项目结构

```
look-busy-2026/
├── index.html                  # 单页入口
├── README.md
├── article-look-busy-2026.md   # 你正在看的这篇
├── styles/
│   ├── main.css                # 训练态：黑底绿字 + CRT 扫描线
│   └── boss.css                # 老板态：白底黑字"公司文档"
└── scripts/
    ├── matrix-rain.js          # Matrix 字符雨
    ├── audio.js                # Web Audio 键盘音
    ├── loss-chart.js           # SVG 双曲线
    ├── progress.js             # 进度条/GPU/ETA
    ├── log-stream.js           # 训练状态机 + 日志生成器（大脑）
    └── boss-key.js             # 老板键状态切换
```

整个项目**没有 npm install、没有构建、没有打包**。双击 `index.html` 就能在 Chrome / Edge 跑起来。

想用静态服务也行：

```bash
cd look-busy-2026
python -m http.server 8000
# 浏览器打开 http://localhost:8000
```

---

## 几个我自己用过觉得很爽的小技巧

1. **开两个屏的时候，把它放在副屏全屏**。主屏正经写代码，副屏永远"在跑训练"，老板从背后过来一眼扫到副屏，会自动忽略主屏。
2. **配合机械键盘音 + 真的随机敲几下键盘**。键盘音是页面里的，真键盘是你手指敲的，两个频率不同步，**会被同事自动脑补成"双线程"**。
3. **大模型公司的同学，可以把 `MoonLight-32B-v0.7` 改成你们公司在炼的真模型名**。这个不算数据泄漏，因为日志全是假的，纯增加可信度。
4. **千万别在团建照片里发出来**。这玩意一旦曝光就玩完，HR 会觉得你"善于伪装、缺乏诚信"——尽管你本来就是这个意思。

---

## 写在最后

AI 越来越强、人越来越多余、绩效越来越严、35 岁越来越近——我们这代码农能做的，可能就是**在这条赛道上多体面那么三五年**。一个会自动跑训练日志的 H5 网页，未必能保住你的工位，**但至少能让你下次摸鱼的时候，心里别那么虚**。

---

## 免责声明

本项目仅用于**让你看起来很忙**，并不能让你真的变忙。使用过程中如果导致：

- 真的被升职：恭喜，记得请客
- 真的被裁：那不是 loss 曲线的问题，是你 KPI 的问题
- 同事拿手机偷拍你："这哥们在炼大模型？"——本人概不负责
- 老板拍肩："小伙子有志气"——下个月该 C 还是 C

**祝各位 2026 体面摸鱼，平安到年终。** 🫡

---

> 完整代码已开源（在项目仓库的 `look-busy-2026/` 目录），双击 `index.html` 即可运行。
>
> 觉得有意思的话，**点个赞 + 转发**，让更多看起来不忙的同行一起卷起来 🙏
