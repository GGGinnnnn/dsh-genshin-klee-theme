# dsh-klee-theme — 可莉（Klee）主题插件

把 DSH Web 界面换成可莉主题：**按窗口比例切换背景**、**替换「探索未至之境」旁边的图标**、**整套配色取自背景图主色调**。

- 插件本体：`dsh-klee-theme/`（标准 DSH 插件包）
- 原始素材：本目录根下的图片（已复制进 `dsh-klee-theme/assets/`）

## 素材与用途对照

| 素材 | 用途 |
| --- | --- |
| `背景（16;9）.jpg`（2278×1280） | 宽屏/横屏窗口的背景 |
| `背景（4;3）.jpg`（1706×1279） | 竖屏/窄窗口的背景 |
| `替换探索未至之境.png`（144×144，PNG） | 首页「探索未至之境」文字左侧的品牌图标 |
| `1.png`（144×144，PNG） | 输入栏右侧发送按钮的图标（原来是向上的箭头） |

插件里对应的资源名分别是 `assets/hero-mark.png` 与 `assets/send-icon.png`（换成易读的英文名，
避免编码问题；根目录的原图保持你给的名字不动）。

> **换图注意**：`assets/` 里的文件按**基本名**识别，扩展名随便（`hero-mark.png` / `.jpg` / `.webp` 都行），
> 内嵌时声明的 MIME 类型取自**文件本身的魔数字节**，不看扩展名。
> 所以换图之后只要重新构建即可，不需要改名——但请把同名旧文件删掉，避免留下旧图。

## 三项需求是怎么实现的

**1. 背景按窗口比例切换**
背景是页面底部一个固定定位的图层（`#dsh-klee-theme-backdrop`）。两张图都用 `background-size: cover` 铺满，
再用媒体查询按窗口宽高比切换：

```css
/* 宽高比 > 13/10（约 1.3）用 16:9 那张 */
@media (max-aspect-ratio: 13/10) { /* 窄于 1.3 时换成 4:3 那张 */ }
```

外壳自身的底色（`--dsw-alias-bg-base`、`--dsw-specific-sidebar-fill`）被改成透明或半透明，
配色调色板本身就带透明度，所以背景既能透出来、文字又仍然清楚。

**1b. 可读性：文字绝不直接压在背景图上**
早期版本为了让背景更明显，把**阅读栏也一起清成透明**了，结果正文直接压在图上的珊瑚色块和米色角色上，
深棕文字和它们叠在一起，怎么看都糊。现在按层处理：

| 层 | 处理 |
| --- | --- |
| 背景图层 | 垫在最底下，做了 `blur(3px)` + 轻微放大（`scale(1.03)`，遮掉模糊边缘），再叠一层暖色薄纱压低高光对比 |
| 外框（frame） | 保持透明，所以背景能在框边和侧边栏处透出来 |
| 阅读栏（center column） | **不透明**，明确用 `var(--dsw-alias-bg-base)` 上色——这条才是可读性契约 |

另外配色里的表面色 alpha 全部提到 0.88 以上（`bg-base` 0.34 → 0.90），
所以即使侧边栏这类半透明面板也仍然有稳定的底色。两个可调项：

- `--dsh-klee-backdrop-strength`：0 = 完全不要背景图，1 = 默认
- `--dsh-klee-artwork-blur`：默认 `blur(3px) saturate(0.94)`，设成 `none` 就是清晰原图

对比度（用最不利的背景图像素算是「文字色 vs 合成后的表面色」，WCAG）：

| 文字层 | 阅读栏（bg-base 0.90） | 侧边栏（0.88） |
| --- | --- | --- |
| primary `#4a2a20` | 9.95 : 1 | 8.86 : 1 |
| secondary `#6f4132` | 6.60 : 1 | 5.88 : 1 |
| tertiary `#81503e` | 5.19 : 1 | 4.62 : 1 |
| caption `#7f4f3d` | 5.30 : 1 | 4.72 : 1 |

全部 ≥ 4.5:1（WCAG AA 正文标准）。这组数字是 `verify-runtime.cjs` 里的断言，
不是手算完就丢的——以后改配色如果掉到 4.5 以下，校验会直接失败。

**2. 图标替换：「探索未至之境」旁边的图标 —— 现在改用确定性的 CSS 方案**
「探索未至之境」旁边的图标，宿主是画成 `inline-flex` 的 `<span>` 里的一个
`<svg aria-hidden="true">`（鲶鱼／鲸鱼标）。插件现在**不再依赖 slot 注册**，而是直接：

- 把那个 `span` 作为定位容器，用 `::after` 把可莉图画上去；
- 把它的 `<svg aria-hidden="true">` 隐藏。

为什么改掉 slot 方案：早先的版本走 `conversation.hero.brand.mark` 这个 slot 注册 React 组件，
再加一层 CSS 兜底，结果出了两个问题——两套机制同时画（两张图并排），以及一旦组件没被宿主渲染，
CSS 兜底又被状态开关挡住，图标直接变成空白。CSS 方案是**无条件**的：不依赖 React、不依赖宿主是否渲染
兜底、也不会画第二张。

选择器用结构判定而不是宿主会变动的类名哈希：`span:has(> svg[aria-hidden="true"]):not(:has(button, a))`
——只认「直接包含 svg 图标的 span」，并**排除**按钮／链接里的图标，避免误伤其它地方的图标。

**2b. 输入栏右侧的发送按钮图标**
发送按钮就是输入栏右侧那个圆形红底按钮，宿主结构为
`<button class="…primary" aria-label="发送消息"><svg …>↑</svg></button>`。
插件用 `button[aria-label*="发送"]`（同时覆盖英文 `Send`/`Steer`/`Queue`）定位：

- 隐藏按钮里的箭头 `<svg>`；
- 在按钮上画 `1.png` 的可莉图（22×22，随按钮圆底居中）。

按钮本身的红色圆形底、hover、禁用态（`opacity:.4`）全部保留，所以"可以点"的观感不变；
**停止**按钮的 `aria-label` 不同（"停止"/"Stop"），因此不会被替换。

**自检小技巧**：插件会把自己匹配到的图标数量写在根节点属性上，
控制台执行 `document.documentElement.dataset.dshKleeThemeHeroMarks` 即可看到数字。
正常情况下它应该等于屏幕上"探索未至之境"标题的数量（通常 1）；如果明显偏大，说明选择器覆盖过宽，
告诉我，我收窄它。

**3. 配色取自背景图主色调**
从两张背景图里取主色：暖珊瑚橘 `#f0a97b`、奶油桃 `#f9d6ba`、深暖棕文字 `#4a2a20`、可莉四叶草红 `#d4452f`。
另外把发送按钮的底色 token（`--dsw-alias-button-info-fill` / `-hover`）也纳入，让按钮跟着主题走。

配色通过 DSH 官方主题接口写入，不是硬塞一份 CSS：

- `ctx.theme.overrideTokens('dsh-klee-theme', …)` —— 把调色板叠在当前主题之上，同时给出**浅色/深色两套**值，
  跟随界面明暗模式，且不动用户存下来的明暗偏好；
- `ctx.theme.register({ id: 'dsh-klee-theme', colorScheme: 'light', tokens })` —— 让「可莉」成为外观设置里
  可选的独立主题。

共覆盖 46 个 `--dsw-alias-*` token（底色、层次、边框、文字、品牌色、状态色、代码块、滚动条、阴影描边）。

## 安装状态

已经装进 **desktop** 配置（也就是当前正在运行的桌面端）：

- `~/.dsh/profiles/desktop/package.json` → `dependencies` 增加
  `"dsh-klee-theme": "file:D:/study/dsh-genshin-klee-theme/dsh-klee-theme"`
- 同一个文件 → `dsh.profile.bundles` 末尾增加 `"dsh-klee-theme"`
- `~/.dsh/profiles/desktop/node_modules/dsh-klee-theme/` 已同步为最新构建（与源目录逐字节一致）

> **需要重启一次 DSH**：组合包只在启动时组合。重启后如果不想用了，见下面「卸载」。

## 重新构建（改了代码或换了图之后）

```powershell
# 重建 + 同步进 desktop 配置（推荐）
node D:\study\dsh-genshin-klee-theme\dsh-klee-theme\scripts\build.mjs --sync "$env:USERPROFILE\.dsh\profiles\desktop"

# 校验：按 DSH 加载契约检查安装
node D:\study\dsh-genshin-klee-theme\dsh-klee-theme\scripts\verify-install.cjs "$env:USERPROFILE\.dsh\profiles\desktop" dsh-klee-theme

# 校验：用假 DOM 真跑一遍产物，断言背景比例切换、图标只画一张、配色层已注册
node D:\study\dsh-genshin-klee-theme\dsh-klee-theme\scripts\verify-runtime.cjs "$env:USERPROFILE\.dsh\profiles\desktop\node_modules\dsh-klee-theme\client\client.js"
```

> 构建脚本每次会自动把补丁版本号 +1，并且 `--sync` 会直接覆盖配置目录里的副本。
> 这是必须的：`file:` 依赖是被**复制**进配置目录的，而 pnpm 对「版本没变」的目录依赖会回答
> 「Already up to date」（`--force` 也一样），不覆盖的话装进去的还是旧包。

## 卸载

```powershell
pwsh -File "D:\study\dsh-genshin-klee-theme\dsh-klee-theme\scripts\uninstall.ps1"
# 之后重启 DSH
```

安装前的 `package.json` / `pnpm-lock.yaml` 等备份在 `~/.dsh/profiles/desktop/.klee-theme-backup/`，
卸载脚本就是从那里还原。也可以改用 DSH 应用内「设置 → 插件」关掉/移除这个 bundle。

## 可调项

| 想改什么 | 怎么改 |
| --- | --- |
| 背景浓度 | 给 `<body>` 设 `--dsh-klee-backdrop-strength`（0 = 只保留配色不要背景图，1 = 默认） |
| 背景清晰度 | 给 `<body>` 设 `--dsh-klee-artwork-blur`（默认 `blur(3px) saturate(0.94)`，`none` = 原图清晰） |
| 文字更清楚 | 提高模板里 `KLEE_TOKENS` 表面色的 alpha（当前 0.88–0.97），或把阅读栏底色改成纯色 |
| 换背景图 | 替换 `dsh-klee-theme/assets/bg-16x9.*` / `bg-4x3.*` 后重新构建并 `--sync` |
| 换英雄图标 | 替换 `dsh-klee-theme/assets/hero-mark.*` 后重新构建并 `--sync`（删掉同名旧文件） |
| 换发送按钮图标 | 替换 `dsh-klee-theme/assets/send-icon.*` 后重新构建并 `--sync` |
| 英雄图标大小 | 模板里 `${HERO_SPAN}::after` 的 `1.7em`（跟随标题字号） |
| 发送图标大小 | 模板里发送按钮 `::after` 的 `width/height: 22px`（按钮本体 34×34） |
| 调配色 | 改模板里的 `KLEE_TOKENS`（浅色）与 `KLEE_TOKENS_DARK`（深色） |
| 比例分界 | 改模板里的 `@media (max-aspect-ratio: 13/10)` |

## 目录结构

```
dsh-genshin-klee-theme/
├─ LICENSE                                                          MIT
├─ 背景（16;9）.jpg / 背景（4;3）.jpg / 替换探索未至之境.png / 1.png   # 原始素材
└─ dsh-klee-theme/                  # 插件包
   ├─ package.json                  # dsh.client（浏览器端声明）+ dsh.bundle（bundle 补丁）
   ├─ cordis.patch.yml              # 把插件挂进配置树的补丁
   ├─ lib/index.js                  # 宿主端（空实现：主题全部在浏览器端）
   ├─ client/client.js              # 构建产物：DSH 实际下发的浏览器端包（约 389 KB，图片已内嵌）
   ├─ assets/                       # 四张图（两个图标 + 两张背景，构建时内嵌成 data URI）
   └─ scripts/
      ├─ client.template.js         # 浏览器端源码模板（改这里）
      ├─ build.mjs                  # 构建（按基本名找图、按魔数判定格式）+ 同步
      ├─ verify-install.cjs         # 按 DSH 加载契约校验安装结果
      ├─ verify-runtime.cjs         # 假 DOM 真跑产物，断言样式与图标行为
      └─ uninstall.ps1              # 还原配置、移除插件
```

## 许可证

MIT，见 [LICENSE](LICENSE)。仓库根目录与插件包内各有一份相同文本：
根目录那份是仓库的许可证，插件包内那份随包发布（写在 `files` 里），使插件被单独安装时同样携带许可证。

## 所有素材均来自官方