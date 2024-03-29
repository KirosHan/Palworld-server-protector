# Palworld-server-protecter
 Palworld服务端进程守护+内存监控+优雅重启
（for windows）

~~希望有人可以帮我加上备份存档功能，懒了。~~  已完成

# GUI版本已发布！

UI版本，自取
[https://github.com/KirosHan/Palworld-server-protector-DotNet](https://github.com/KirosHan/Palworld-server-protector-DotNet)

![预览](https://raw.githubusercontent.com/KirosHan/Palworld-server-protector-DotNet/main/PNG/screen.png)

## 功能
- 内存监控（自定义阈值触发）
- 进程守护（当前如果没有服务端运行就自动重启）
- 优雅重启（内存占用达到阈值后自动发送公告并关服等待重启）
- 自动备份存档

## 使用方法
使用前请先安装nodejs环境

服务端配置文件中RCONEnabled需要设置为True

1.修改`index.ts`中顶部的配置信息，如路径、周期、端口、密码等

2.在目录命令行中运行`npm install`

3.在目录命令行中运行`npm run build`

4.在目录命令行中运行`npm start`

游戏存档备份会保存到/dist/backup中

## Star and a Coffee

如果这个仓库对你有用，欢迎点个Star⭐︎

也可以Buy me a coffee☕︎

![BuyMeACoffee](https://raw.githubusercontent.com/KirosHan/Palworld-server-protector/main/PNG/buymeacoffee.png)

## 运行逻辑

```mermaid
graph TD
    A[开始] --> B[检查内存使用]
    B --> C{检查是否超过预设阈值}
    C -- 是 --> D[发送重启命令并重启]
    C -- 否 --> E[检查进程是否运行]
    E -- 是 --> F[等待下一个监控周期]
    E -- 否 --> G[启动进程]
    G --> F
    D --> F
    A --> H[定时备份游戏存档]
    H --> I[等待下一个备份周期]
    I --> H
```
## 已知问题
1.受服务端限制，rcon发送的文本中无法保留空格

2.受服务端限制，rcon无法发送中文，服务端使用的并非ascii和utf8

