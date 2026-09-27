# 雾海余生 · MISTBOUND

浏览器 2.5D 多人合作荒岛生存游戏，当前为 0.2 可玩开发版。支持单人直接创建世界，也可邀请朋友进入同一房间（最多 8 人）。

## 启动

安装 Node.js 20 或更新版本。Windows 用户可双击 `START-GAME.cmd`，或在项目目录运行：

```sh
npm install
npm start
```

打开 http://localhost:3000 ，输入昵称后点击“自己开房 · 开始求生”。服务器使用 `PORT` 环境变量指定端口，默认 3000。

## 操作

- WASD / 方向键移动，Shift 奔跑，空格闪避，右键格挡。
- E 交互或采集，鼠标点击资源采集，点击空地攻击，按住后松开蓄力。
- 1–9 选择快捷栏，F 使用物品。
- Tab 背包，C 制作，B 建造，M 地图，H 手册。
- 建造时 R 旋转、G 切换吸附、Esc 取消。P 标记位置。

## 联机与保存

玩家必须连接同一个 Node.js 服务。邀请码只在该服务内有效。异地联机需要可访问的公网服务并支持 WebSocket；localhost 邀请链接只能本机使用。GitHub 仓库用于托管源码，GitHub Pages 无法运行该多人服务器。

世界每 15 秒保存到 `saves/`，可通过 `SAVE_DIR` 修改保存位置。角色恢复令牌保存在浏览器本地，请勿随意清除浏览器数据。存档和令牌不应提交到 GitHub。

## 架构与验证

`shared/` 保存物品、世界与公共规则；`server/` 执行权威模拟；`public/core/`、`public/render/`、`public/ui/` 负责连接、画面和交互。运行 `npm test` 执行系统与真实 WebSocket 集成测试。

详见 [架构说明](ARCHITECTURE.md) 与 [开发状态及未完成项](STATUS.md)。当前人物移动修复尚在进行，上传代码保留开发进度。
