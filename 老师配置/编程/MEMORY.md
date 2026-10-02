# 编程老师 · 当前状态

> 本文件记录编程老师的工作状态。编程项目不以 `学习档案/` 薄弱点体系追踪；进度以本文件与 `apps/web/` 代码为准。

---

## 当前项目状态

| 项 | 状态 |
|----|------|
| 基础设施 | ✅ Cloudflare Pages `gugeegoo`，CI / Wrangler 见 `infra/cloudflare/pages.md` |
| 线上站点 | https://gugeegoo.pages.dev |
| 导航页 `/` | 游戏导航页（贪吃蛇 + 坦克大战） |
| 贪吃蛇 | ✅ `/snake/` — **15 关**、主菜单、自由选关、道具商店、武器库、圆头蛇 |
| 坦克大战 | 🚧 `/tank/` — **可玩框架**（2 关占位地图）；关卡/敌人/道具内容待景源后续填充 |
| KV | 绑定名 `GAME_KV`（待家长填入 namespace id）；存档含 `levelStats`、`equippedWeaponId` |

---

## 已部署 / 已做内容

| 类型 | 位置 | 状态 |
|------|------|------|
| 游戏导航页 | `apps/web/index.html`、`src/games.js` | ✅ |
| 贪吃蛇 UI | `snake/index.html`、`src/snake/main.js`、`ui-screens.js` | ✅ 主菜单 / 选关 / 商店 / 武器 / 对局分离 |
| 积分与道具 | `items.js`、`shop.js`、`item-effects.js` | ✅ 7 种道具，下关携带（菜单商店配置） |
| 武器 | `weapons.js`、`weapon-shop.js`、`game-combat.js` | ✅ 弹弓 / 冰冻枪 / 火箭炮 |
| 选关进度 | `level-progress.js` | ✅ 每关 cleared + bestScore |
| Pages Functions | `apps/web/functions/api/game/` | ✅ 钱包 + levelStats + equippedWeaponId |
| 坦克框架 | `tank/index.html`、`src/tank/*` | ✅ 循环 / 碰撞 / AI / 渲染分模块；本地最高分 `gugeegoo_tank_best_score` |

---

## 坦克大战 · 框架（景源后续填内容）

| 模块 | 文件 | 以后加什么 |
|------|------|------------|
| 关卡地图 | `levels.js` | 新关：复制 `grid` 字符串（`.` 空地 `B` 砖 `S` 钢 `P` 玩家 `E` 敌人） |
| 敌人 AI | `ai.js` | 新行为、不同速度/射速 |
| 实体 | `entities.js` | 新坦克类型、道具实体 |
| 碰撞 | `collision.js` | 新地形、道具碰撞 |
| 常量 | `constants.js` | 难度、速度、分数 |
| 主循环 | `game-loop.js` | 胜负规则、道具效果 |
| 绘制 | `render.js` | 贴图、动画 |

操作：方向键/WASD 移动；空格或 J 发射；手机左下发射、右下十字键。

---

## 贪吃蛇 · 操作与流程

1. **主菜单**：开始游戏（上次选关）、选关、道具商店、武器库、返回导航页。
2. **对局**：不能进商店；**退出游戏** 回菜单并照常入账积分。
3. **控制**：方向键 / WASD / 滑动 / 右下角十字 D-pad；**J 或 F** 或左下 **🔫发射**（有限弹药 + 冷却）。
4. **过关**：可「下一关」、选关、回主菜单；15 关全开。

---

## 武器表（商店）

| 图标 | 名称 | 价格 | 每关弹药 | 效果 |
|------|------|------|----------|------|
| 🪨 | 弹弓 | 免费 | 5 | 打碎 1 块固定石头 |
| ❄️ | 冰冻枪 | 220 | 4 | 冻住移动石头约 3 秒 |
| 🚀 | 火箭炮 | 380 | 3 | 直线打碎路上固定石头（不穿外墙） |

---

## 待办

- [ ] 家长提供 KV namespace id → `wrangler.toml` + Pages 控制台 `GAME_KV`

---

## 更新日志

| 日期 | 内容 |
|------|------|
| 2026-09-30 | 新建编程老师配置；Hello World 已部署 |
| 2026-10-01 | 游戏导航页；贪吃蛇 15 关；十字方向键；积分与 7 道具 |
| 2026-10-01 | 主菜单、自由选关、武器系统、对局与商店分离（commit `274ab32`） |
| 2026-10-02 | 坦克大战框架 `/tank/` 上线导航页（占位 2 关） |

---

*线上真源：push `main` 后的 https://gugeegoo.pages.dev 与 `apps/web/` 源码。*
