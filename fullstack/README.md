# Wired.meme

Wired.meme 是一个基于 Sui 区块链的meme创建与交易的项目。

## 技术栈

- Sui Move 智能合约
- Next.js 框架
- TypeScript
- Prisma ORM
- TailwindCSS

### 环境要求
- Node.js >= 20
- Sui 钱包

## 主要功能

### 1. Meme coin创建
- AI 辅助创建：基于热点话题自动生成 meme coin
- 自定义创建：支持自定义coin名称、符号、描述等信息
- 图标生成：AI 自动生成coin图标
- 智能合约部署：自动部署coin合约到 Sui 区块链
- AI 自动化创建：每2小时自动获取 Google 热点话题并创建对应的 meme coin
  - 获取热点：实时获取 Google Trends 数据
  - AI 分析：智能分析话题并生成 coin 信息
  - 图片存储：自动将 AI 生成的图片上传至 Walrus 永久存储
  - 自动部署：自动部署合约并创建流动性池

### 2. coin交易
- 实时价格显示：展示coin当前价格、市值等信息
- K线图表：提供专业的交易图表分析
- 买卖功能：支持coin的买入和卖出操作
- 流动性信息：显示coin池的流动性数据

### 3. 市场行情
- coin列表：展示所有已创建的coin
- 实时数据：包括价格、市值、流动性等关键指标
- 排序筛选：支持多维度的coin排序
- 创建者信息：显示coin创建者地址

### 4. 数据看板
- 交易量统计：24小时交易量展示
- 项目统计：实时项目数量统计
- 实时更新：数据自动更新

## 特色功能

- 实时价格更新
- AI 生成
- 钱包集成

## 安装使用

```bash
# 安装依赖
bun install

# 启动开发服务器
bun dev
