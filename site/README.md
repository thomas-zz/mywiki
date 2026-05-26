# myWiki Panel (site/)

可视化面板的 Next.js 源码。普通用户无需进入此目录 — 面板已预构建并随 npm 包分发。

## 开发

```bash
cd site
npm install
WIKI_DIR=~/mywiki npm run dev
```

访问 http://localhost:3000

## 构建

```bash
npm run build
```

产物在 `.next/standalone/`，由根目录 `scripts/build-site.sh` 打包为 `site-dist/`。
