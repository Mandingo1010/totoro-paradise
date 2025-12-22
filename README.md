# Totoro-paradise

Fuck `totoro school`, without MITM.

The name is netaed from `nekopara`.

## 感谢 @BeiYanYunYi
- 源码来自 https://github.com/BeiyanYunyi/totoro-paradise

## ✨ 功能特性

### 阳光跑 (Sun Run)
- 支持固定路线的阳光跑模拟
- 自动生成符合要求的跑步数据
- 与龙猫校园服务器无缝对接

### 自由跑 (Free Run) 🆕
自由跑功能允许用户模拟提交自定义距离和时间的跑步记录，不受固定路线限制。

#### 核心功能
- **自定义参数**: 支持设置0.5-20公里的跑步距离，3-25公里/小时的速度范围
- **智能数据生成**: 自动计算配速、卡路里、步数等真实跑步数据
- **预设模板**: 提供三种预设模板快速开始
  - 🚶 **轻松跑**: 3公里，6-8公里/小时
  - 🏃 **标准跑**: 5公里，8-12公里/小时
  - 🏃‍♂️ **挑战跑**: 10公里，10-15公里/小时
- **批量执行**: 支持1-10次批量提交，可设置1-60分钟间隔
- **记录管理**: 查看历史记录、过滤搜索、导出数据

#### 使用方法
1. 登录后在主页选择"自由跑"模式
2. 设置跑步参数或选择预设模板
3. 点击"开始跑步"进入模拟执行
4. 等待倒计时结束自动提交数据
5. 在"跑步记录"页面查看历史

## 🏗️ How to build

```bash
pnpm i
pnpm build
```

## 🚀 How to run

```bash
pnpm start
```

## ⚛️ How to develop

```bash
pnpm dev
```

## 🧪 How to test

```bash
# 运行所有测试
pnpm test

# 运行测试并生成覆盖率报告
pnpm test:coverage

# 运行特定测试文件
pnpm test src/classes/ParameterValidator.test.ts
```

## 📁 项目结构

```
totoro-paradise/
├── components/           # Vue组件
│   ├── FreeRunSetup.vue      # 自由跑参数设置
│   ├── FreeRunExecution.vue  # 跑步执行页面
│   ├── FreeRunRecords.vue    # 记录列表
│   ├── FreeRunDetail.vue     # 记录详情
│   ├── BatchRunSetup.vue     # 批量设置
│   └── BatchRunExecution.vue # 批量执行
├── composables/          # Vue Composables
│   ├── useFreeRun.ts         # 自由跑状态管理
│   ├── useFreeRunConfig.ts   # 配置管理
│   └── useSession.ts         # 会话管理
├── pages/                # 页面路由
│   ├── freerun.vue           # 自由跑主页
│   ├── records.vue           # 记录页面
│   └── records/free/[id].vue # 记录详情页
├── src/
│   ├── classes/          # 核心类
│   │   ├── ParameterValidator.ts    # 参数验证
│   │   ├── RunCalculator.ts         # 数据计算
│   │   ├── FreeRunDataGenerator.ts  # 数据生成
│   │   ├── BatchDataGenerator.ts    # 批量生成
│   │   ├── TemplateManager.ts       # 模板管理
│   │   ├── RecordManager.ts         # 记录管理
│   │   ├── FreeRunErrorHandler.ts   # 错误处理
│   │   └── FreeRunConfig.ts         # 配置类
│   ├── types/            # TypeScript类型定义
│   │   ├── requestTypes/     # 请求类型
│   │   └── responseTypes/    # 响应类型
│   ├── utils/            # 工具函数
│   └── wrappers/         # API包装器
│       └── TotoroApiWrapper.ts
├── server/               # 服务端API
└── tests/                # 测试文件
    └── integration/      # 集成测试
```

## 🔧 配置说明

### 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `NUXT_PUBLIC_API_BASE` | API基础URL | `/api` |
| `NUXT_PUBLIC_TOTORO_SERVER` | 龙猫服务器地址 | - |

### 自由跑配置

配置文件位于 `composables/useFreeRunConfig.ts`，支持以下配置项：

```typescript
{
  api: {
    endpoints: {
      submit: '/totoro/freerun',
      query: '/totoro/freerun/records',
      detail: '/totoro/freerun/detail'
    },
    timeout: 30000,
    retryConfig: {
      maxAttempts: 3,
      backoffStrategy: 'exponential',
      baseDelay: 1000,
      maxDelay: 10000
    }
  },
  dataGeneration: {
    validationRules: {
      minDistance: 0.5,
      maxDistance: 20,
      minSpeed: 3,
      maxSpeed: 25,
      minBatchCount: 1,
      maxBatchCount: 10,
      minInterval: 1,
      maxInterval: 60
    }
  },
  ui: {
    defaultParams: {
      distance: 3,
      avgSpeed: 8
    }
  }
}
```

## 📝 API文档

### 自由跑API端点

#### 提交自由跑记录
```
POST /api/totoro/freerun
```

请求体：
```json
{
  "distance": "3.00",
  "duration": "1350",
  "avgSpeed": "8.00",
  "avgPace": "7:30",
  "calorie": "180",
  "steps": "3600",
  "startTime": "2024-01-01 08:00:00",
  "endTime": "2024-01-01 08:22:30",
  "mac": "AA:BB:CC:DD:EE:FF",
  "deviceInfo": "Android 13",
  "runType": "1"
}
```

#### 查询自由跑记录
```
POST /api/totoro/freerun/records
```

#### 获取记录详情
```
POST /api/totoro/freerun/detail
```

## ⚠️ 免责声明

本项目仅供学习和研究目的，请勿用于任何违反学校规定或法律法规的行为。使用本项目产生的任何后果由使用者自行承担。

## 📝 License

[AGPL-3.0](LICENSE)
