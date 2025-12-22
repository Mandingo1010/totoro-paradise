# Totoro Paradise - 项目技术分析

## 项目概述

**项目名称**: Totoro Paradise  
**项目描述**: 一个用于模拟学生跑步打卡的系统，绕过龙猫（Totoro）学校运动应用的中间人攻击（MITM）检测  
**项目状态**: 已中止维护（作者已大学毕业）  
**许可证**: AGPL-3.0

---

## 技术栈

### 前端框架
- **Nuxt 3.9.1** - Vue 3 全栈框架
- **Vue 3.4.21** - 渐进式JavaScript框架
- **Vue Router 4.3.0** - 路由管理
- **Vuetify 3.4.10** - Material Design UI组件库
- **UnoCSS 0.58.3** - 原子化CSS框架

### 后端/服务器
- **Nitro** - Nuxt内置的服务器引擎
- **Node.js** - JavaScript运行时

### 加密与安全
- **NodeRSA** - RSA加密库（用于请求加密）
- **MD5** - 哈希算法（用于MAC生成）
- **Buffer** - Node.js缓冲区处理

### 工具库
- **ky 1.2.3** - 轻量级HTTP客户端
- **date-fns 2.30.0** - 日期处理库
- **uuid 9.0.1** - UUID生成
- **cli-progress 3.12.0** - CLI进度条
- **minimist 1.2.8** - 命令行参数解析
- **@vueuse/core 10.7.1** - Vue组合式API工具库

### 地图
- **@amap/amap-jsapi-loader 1.0.1** - 高德地图API加载器

### 开发工具
- **TypeScript 5.3.3** - 类型检查
- **ESLint 8.57.0** - 代码检查
- **Prettier** - 代码格式化
- **pnpm 8.15.5** - 包管理器

---

## 项目结构

```
totoro-paradise/
├── pages/                          # 前端页面
│   ├── index.vue                  # 首页 - 微信二维码扫描登录
│   ├── scanned.vue                # 扫描后 - 路线选择页面
│   ├── decode.vue                 # 调试页面 - 加密/解密工具
│   └── run/[route].vue            # 动态路由 - 跑步执行页面
├── components/
│   └── AMap.client.vue            # 高德地图组件
├── composables/
│   ├── useSession.ts              # 会话状态管理
│   └── useSunRunPaper.ts          # 跑步任务数据管理
├── server/api/                    # 后端API端点
│   ├── run/                       # 跑步相关API
│   │   ├── getRunBegin.post.ts   # 开始跑步
│   │   ├── getSunRunArchDetail.post.ts
│   │   ├── sunRunExercises.post.ts
│   │   └── sunRunExercisesDetail.post.ts
│   ├── scanQr/                    # 二维码扫描API
│   │   ├── index.ts              # 获取微信登录二维码
│   │   └── [uuid].ts             # 轮询检查扫描结果
│   ├── sunRunPaper.post.ts        # 获取跑步任务信息
│   └── totoro/[...slug].ts        # 代理到龙猫服务器
├── src/
│   ├── classes/
│   │   ├── UserSession.ts         # 用户会话类
│   │   └── Vector.ts              # 向量计算类
│   ├── controllers/
│   │   └── generateSunRunExercisesReq.ts  # 生成跑步请求
│   ├── middlewares/
│   │   ├── getDecryptedData.ts    # 请求解密中间件
│   │   └── setHeader.ts           # 响应头设置中间件
│   ├── types/
│   │   ├── requestTypes/          # 请求类型定义
│   │   └── responseTypes/         # 响应类型定义
│   ├── utils/
│   │   ├── encryptRequestContent.ts    # RSA加密
│   │   ├── decryptRequestContent.ts    # RSA解密
│   │   ├── generateRoute.ts            # 路线生成算法
│   │   ├── distanceCalculator.ts       # 距离计算（地球坐标）
│   │   ├── generateMac.ts              # MAC地址生成
│   │   ├── normalRandom.ts             # 正态分布随机数
│   │   ├── calCalculator.ts            # 卡路里计算
│   │   ├── timeUtil.ts                 # 时间工具
│   │   └── nodeRSA.ts                  # RSA库（打包版本）
│   ├── data/
│   │   └── rsaKeys.ts             # RSA密钥对
│   └── wrappers/
│       └── TotoroApiWrapper.ts     # 龙猫API包装器
├── utils/
│   ├── getCenter.ts               # 获取坐标中心点
│   └── poem.ts                    # 诗句数据
├── nuxt.config.ts                 # Nuxt配置
├── tsconfig.json                  # TypeScript配置
├── package.json                   # 项目依赖
└── README.md                      # 项目说明
```

---

## 核心功能流程

### 1. 用户认证流程

```
用户访问首页
    ↓
获取微信登录二维码 (scanQr/index.ts)
    ↓
用户用微信扫码
    ↓
轮询检查扫描结果 (scanQr/[uuid].ts)
    ↓
获取登录令牌 (TotoroApiWrapper.getLesseeServer)
    ↓
获取用户详细信息 (TotoroApiWrapper.login)
    ↓
保存会话信息到状态管理
    ↓
跳转到路线选择页面
```

### 2. 跑步执行流程

```
用户选择路线
    ↓
点击"开始跑步"
    ↓
生成跑步请求 (generateSunRunExercisesReq)
    ↓
向龙猫服务器发送"开始跑步"请求 (getRunBegin)
    ↓
等待指定时间（模拟跑步时间）
    ↓
生成虚假路线数据 (generateRoute)
    ↓
发送跑步成绩 (sunRunExercises)
    ↓
发送详细路线数据 (sunRunExercisesDetail)
    ↓
跑步完成
```

---

## 关键技术实现

### 1. 加密通信

**RSA加密方案**:
- 使用RSA-1024位加密
- PKCS#1填充方案
- 所有请求体都被加密为Base64字符串
- 密钥存储在 `src/data/rsaKeys.ts`

```typescript
// 加密流程
const encryptRequestContent = (req: Record<string, any>): string => {
  const rsa = new NodeRSA(rsaKeys.privateKey);
  rsa.setOptions({ encryptionScheme: 'pkcs1' });
  const reqStr = JSON.stringify(req);
  return rsa.encrypt(reqStr, 'base64');
};
```

### 2. 路线生成算法

**核心算法**:
1. 从任务中获取标准路线点
2. 在相邻路线点之间插入密集的中间点（步长0.0001度）
3. 从随机起点开始，按指定距离截取路线
4. 对每个点添加正态分布的偏差（标准差 1/50000）
5. 返回模拟的GPS坐标序列

```typescript
// 距离计算使用Haversine公式
const distanceBetweenPoints = (pointA, pointB) => {
  // 将经纬度转换为弧度
  // 使用球面三角法计算大圆距离
  // 返回米为单位的距离
};
```

### 3. 请求伪造

**跑步请求包含的虚假数据**:
- `avgSpeed` - 平均速度（根据距离和时间计算）
- `steps` - 步数（1000-2000随机）
- `usedTime` - 使用时间（HH:mm:ss格式）
- `phoneInfo` - 手机信息（iPhone15,4/17.4.1）
- `mac` - MAC地址（基于学号生成）
- `startTime/endTime` - 开始/结束时间
- `fitDegree` - 适应度（固定值"1"）

### 4. 时间控制

**等待时间计算**:
- 使用正态分布生成等待时间
- 平均值 = (最短时间 + 最长时间) / 2
- 标准差 = (最长时间 - 平均值) / 3
- 确保生成的时间在允许范围内

```typescript
const waitSecond = Math.floor(
  normalRandom(minSecond + maxSecond / 2, (maxSecond - avgSecond) / 3)
);
```

---

## API端点详解

### 微信登录相关

| 端点 | 方法 | 功能 |
|------|------|------|
| `/api/scanQr` | GET | 获取微信登录二维码 |
| `/api/scanQr/[uuid]` | GET | 轮询检查扫描结果 |

### 龙猫服务器代理

| 端点 | 方法 | 功能 |
|------|------|------|
| `/api/totoro/platform/serverlist/getRegisterUrl` | POST | 获取注册URL |
| `/api/totoro/platform/serverlist/getLesseeServer` | POST | 获取服务器信息 |
| `/api/totoro/platform/login/login` | POST | 用户登录 |
| `/api/totoro/platform/login/getAppFrontPage` | POST | 获取首页信息 |
| `/api/totoro/sunrun/getRunBegin` | POST | 开始跑步 |
| `/api/totoro/sunrun/getSunrunPaper` | POST | 获取跑步任务 |
| `/api/totoro/platform/recrecord/sunRunExercises` | POST | 提交跑步成绩 |
| `/api/totoro/platform/recrecord/sunRunExercisesDetail` | POST | 提交详细路线 |

### 本地API

| 端点 | 方法 | 功能 |
|------|------|------|
| `/api/sunRunPaper.post` | POST | 获取跑步任务（本地包装） |

---

## 数据流向

### 请求流向

```
前端页面
    ↓
Nuxt API路由 (/api/*)
    ↓
TotoroApiWrapper (请求包装)
    ↓
加密处理 (encryptRequestContent)
    ↓
ky HTTP客户端
    ↓
龙猫服务器 (app.xtotoro.com)
```

### 响应流向

```
龙猫服务器
    ↓
ky HTTP客户端
    ↓
Nuxt API路由
    ↓
前端页面 (useFetch/TotoroApiWrapper)
    ↓
Vuetify UI组件
```

---

## 状态管理

### 用户会话 (useSession)

```typescript
interface Session {
  token: string;              // 认证令牌
  stuNumber: string;          // 学号
  stuName: string;            // 姓名
  schoolId: string;           // 学校ID
  campusId: string;           // 校区ID
  phoneNumber: string;        // 电话号码
  headPortrait: string;       // 头像URL
  // ... 其他字段
}
```

### 跑步任务 (useSunRunPaper)

```typescript
interface SunRunPaper {
  mileage: string;            // 里程数
  minTime: string;            // 最短时间（分钟）
  maxTime: string;            // 最长时间（分钟）
  ifHasRun: string;           // 是否已跑过
  runPointList: RunPoint[];    // 可用路线列表
}

interface RunPoint {
  taskId: string;
  pointId: string;
  pointName: string;
  longitude: string;
  latitude: string;
  pointList: Point[];          // 路线坐标点
}
```

---

## 关键工具函数

### 距离计算 (distanceCalculator.ts)

使用Haversine公式计算两点间的大圆距离：
- 输入：两个[经度, 纬度]坐标
- 输出：米为单位的距离
- 精度：适合GPS应用

### 向量计算 (Vector.ts)

```typescript
class Vector {
  vectorArray: number[];      // 向量数组
  norm: number;               // 向量模长
  unitVector: number[];       // 单位向量
}
```

用于计算路线方向和插值点。

### 正态分布随机数 (normalRandom.ts)

使用Box-Muller变换生成正态分布的随机数，用于：
- 生成等待时间
- 添加GPS坐标偏差

### MAC地址生成 (generateMac.ts)

基于学号生成虚假的MAC地址，用于设备识别。

---

## 安全特性

### 1. 请求加密
- 所有请求体使用RSA加密
- 防止中间人攻击检测

### 2. 用户代理伪装
```
User-Agent: okhttp/4.9.0
```
伪装为Android应用的HTTP客户端

### 3. 请求头伪装
```
Host: app.xtotoro.com
Connection: Keep-Alive
Accept-Encoding: gzip
```

### 4. 数据伪造
- 虚假的GPS轨迹
- 虚假的步数和速度
- 虚假的MAC地址
- 虚假的手机信息

---

## 构建与部署

### 开发
```bash
pnpm install
pnpm dev
```
启动开发服务器（通常在 http://localhost:3000）

### 构建
```bash
pnpm build
```
生成生产版本到 `.output` 目录

### 运行
```bash
pnpm start
```
启动生产服务器

### Docker支持
项目包含 `Dockerfile` 和 `docker-compose.yml`，支持容器化部署。

---

## 关键配置

### Nuxt配置 (nuxt.config.ts)

- **SSR**: 禁用（`ssr: false`）
- **路由代理**: `/totoro/**` 代理到 `https://app.xtotoro.com/app/**`
- **Vite优化**: 包含Buffer、date-fns等库的预优化
- **Vuetify集成**: 自动导入Material Design组件

### TypeScript配置

继承自 `.nuxt/tsconfig.json`，支持完整的类型检查。

---

## 性能优化

1. **预优化依赖**: 在Vite中预优化常用库
2. **代码分割**: Nuxt自动处理路由级别的代码分割
3. **UnoCSS**: 原子化CSS，减少样式体积
4. **客户端渲染**: 禁用SSR，减少服务器负担

---

## 已知限制

1. **项目已停止维护** - 不再更新
2. **龙猫API可能变化** - 加密方案或端点可能已更改
3. **地理位置限制** - 仅支持中国学校
4. **单用户会话** - 不支持并发用户

---

## 相关文件映射

| 功能 | 文件 |
|------|------|
| 用户认证 | `pages/index.vue`, `TotoroApiWrapper.ts` |
| 路线选择 | `pages/scanned.vue`, `useSunRunPaper.ts` |
| 跑步执行 | `pages/run/[route].vue`, `generateRoute.ts` |
| 加密通信 | `encryptRequestContent.ts`, `decryptRequestContent.ts` |
| 地图显示 | `components/AMap.client.vue` |
| 调试工具 | `pages/decode.vue` |

---

## 总结

Totoro Paradise是一个精心设计的系统，用于模拟学生跑步打卡。它通过以下方式绕过检测：

1. **加密通信** - RSA加密所有请求
2. **数据伪造** - 生成逼真的GPS轨迹和运动数据
3. **请求伪装** - 伪装为官方应用
4. **时间控制** - 使用正态分布模拟真实的跑步时间

项目展示了对地理信息系统、加密算法、Web框架和API集成的深入理解。

