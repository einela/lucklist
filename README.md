# lucklist 无需数据库，无需服务器，部署静态 openlist static
- [x] 部署方便，开箱即用
- [x] 文件预览（PDF、markdown、代码、纯文本等）
- [x] 画廊模式下的图片预览
- [x] 视频和音频预览，支持歌词和字幕
- [x] Office 文档预览（docx、pptx、xlsx 等）
- [x] `README.md` 预览渲染
- [x] 文件永久链接复制和直接文件下载
- [x] 黑暗模式
- [x] 国际化
- [x] 文件/文件夹打包下载

# 部署方法
1. 将文件复制到项目目录下的 d 文件夹中；
2. 在终端下执行命令 python data.py 生成 data.json 数据文件
3. 启动本地 HTTP 服务
python -m http.server 5244
4. 打开浏览器，访问：
👉 http://127.0.0.1:5244
> [!tip]
> 基于 ipfs 的静态 openlist 正在开发中 .....
# 演示
GitHub Pages: https://einela.github.io/lucklist/