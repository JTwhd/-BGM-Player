# 在线音乐库管理工具

## 概述
这个工具用于管理 Valorant BGM Player 的在线音乐库和激活码系统。

## 功能
- ✅ 生成激活码（支持设置有效期）
- ✅ 查看所有激活码
- ✅ 删除激活码
- ✅ 管理音乐库（添加/删除音乐）

## 使用方法

### 1. 运行管理工具
```bash
cd d:\jianfeiyou\valorant-bgm-player
node admin-tool.js
```

### 2. 生成激活码
```
选择操作: 1
输入有效期天数（留空为永久）: 30
```
生成后会将激活码保存到 `config/activation-codes.json` 文件中。

### 3. 分发激活码给用户
用户打开程序 → 进入"在线音乐库" → 输入激活码 → 激活成功

## 文件结构
```
config/
├── activation-codes.json  # 激活码数据库
├── music-library.json     # 音乐库数据
└── config.json            # 用户配置文件
```

## 未来扩展
- 添加支付系统（微信/支付宝）
- 添加在线API服务
- 添加用户管理后台
- 部署到云服务器

## 当前状态
- ✅ 本地版本已完成
- ⏳ 在线版本开发中
