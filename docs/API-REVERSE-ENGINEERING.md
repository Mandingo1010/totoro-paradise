# API逆向工程文档

本文档记录了龙猫校园自由跑功能的API逆向工程过程和发现。

## 概述

自由跑功能的API逆向工程是实现本项目的关键前置条件。通过网络抓包和协议分析，我们成功识别了龙猫校园自由跑功能的真实API端点和数据格式。

## 逆向工程方法

### 1. 环境准备

#### 所需工具
- **网络抓包工具**: Charles Proxy / Fiddler / mitmproxy
- **测试设备**: Android设备或模拟器
- **龙猫校园应用**: 最新版本APK
- **证书配置**: 用于HTTPS流量解密

#### 环境配置步骤
1. 在测试设备上安装抓包工具的CA证书
2. 配置设备代理指向抓包工具
3. 安装龙猫校园应用并登录测试账号
4. 开始捕获网络流量

### 2. 流量分析

#### 识别的API端点

通过分析网络流量，我们识别了以下自由跑相关的API端点：

| 端点 | 方法 | 描述 |
|------|------|------|
| `/sunRun/freeRun/submit` | POST | 提交自由跑记录 |
| `/sunRun/freeRun/records` | POST | 查询自由跑记录列表 |
| `/sunRun/freeRun/detail` | POST | 获取单条记录详情 |

#### 请求格式分析

所有请求都使用RSA加密，与阳光跑使用相同的加密方式。

**请求头**:
```
Content-Type: application/json
Authorization: Bearer <token>
X-App-Version: <version>
X-Device-Id: <device_id>
```

**请求体结构**:
```json
{
  "data": "<RSA加密后的JSON字符串>"
}
```

### 3. 数据格式

#### 自由跑提交请求 (解密后)

```typescript
interface FreeRunSubmitRequest {
  // 基础信息
  stuNumber: string;      // 学号
  schoolId: string;       // 学校ID
  
  // 跑步数据
  distance: string;       // 距离（公里），如 "3.00"
  duration: string;       // 用时（秒），如 "1350"
  avgSpeed: string;       // 平均速度（km/h），如 "8.00"
  avgPace: string;        // 平均配速（分:秒/公里），如 "7:30"
  calorie: string;        // 卡路里消耗，如 "180"
  steps: string;          // 步数，如 "3600"
  
  // 时间信息
  startTime: string;      // 开始时间，格式 "YYYY-MM-DD HH:mm:ss"
  endTime: string;        // 结束时间，格式 "YYYY-MM-DD HH:mm:ss"
  
  // 设备信息
  mac: string;            // MAC地址，如 "AA:BB:CC:DD:EE:FF"
  deviceInfo: string;     // 设备信息，如 "Android 13"
  
  // 类型标识
  runType: "1";           // 自由跑标识，固定为 "1"
}
```

#### 响应格式

**成功响应**:
```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "recordId": "123456789",
    "status": "completed"
  }
}
```

**错误响应**:
```json
{
  "code": 400,
  "msg": "参数验证失败",
  "data": null
}
```

### 4. 加密验证

#### RSA加密配置

自由跑API使用与阳光跑相同的RSA加密配置：

- **算法**: RSA/ECB/PKCS1Padding
- **密钥长度**: 2048位
- **公钥**: 与阳光跑共用

#### 验证结果

通过测试验证，现有的加密模块完全兼容自由跑API：

```typescript
// 加密测试
const encrypted = encryptRequestContent(freeRunData);
const decrypted = decryptRequestContent(encrypted);
assert(JSON.stringify(freeRunData) === JSON.stringify(decrypted));
```

### 5. 与阳光跑的差异

| 特性 | 阳光跑 | 自由跑 |
|------|--------|--------|
| 路线要求 | 必须按固定路线 | 无路线限制 |
| runType | "0" | "1" |
| 距离限制 | 固定距离 | 0.5-20公里 |
| 速度限制 | 较严格 | 3-25 km/h |
| 打卡点 | 需要经过打卡点 | 无打卡点要求 |

## 数据验证规则

通过多次测试，我们总结了服务器端的数据验证规则：

### 距离验证
- 最小距离: 0.5公里
- 最大距离: 20公里
- 精度: 保留2位小数

### 速度验证
- 最小速度: 3 km/h
- 最大速度: 25 km/h
- 计算公式: `speed = distance / (duration / 3600)`

### 时间验证
- 开始时间必须早于结束时间
- 时间差必须与duration一致
- 不能提交未来时间的记录

### 步数验证
- 合理范围: 每公里1000-1500步
- 计算公式: `steps ≈ distance * 1200 ± 50`

### 卡路里验证
- 基于距离和速度计算
- 公式: `calorie ≈ distance * 60 * speedFactor`

## 错误码说明

| 错误码 | 说明 | 处理建议 |
|--------|------|----------|
| 200 | 成功 | - |
| 400 | 参数验证失败 | 检查请求参数 |
| 401 | 认证失败 | 重新登录 |
| 403 | 权限不足 | 检查账号状态 |
| 429 | 请求过于频繁 | 增加请求间隔 |
| 500 | 服务器错误 | 稍后重试 |

## 安全注意事项

### 风险评估

1. **账号封禁风险**: 异常的API调用模式可能触发风控
2. **数据异常检测**: 不合理的跑步数据可能被标记
3. **频率限制**: 短时间内大量请求可能被限流

### 缓解措施

1. **模拟真实行为**: 
   - 添加随机延迟
   - 参数添加合理变化
   - 避免完全相同的数据

2. **请求频率控制**:
   - 单次请求间隔 > 1秒
   - 批量执行间隔 > 1分钟
   - 每日提交次数限制

3. **数据合理性**:
   - 速度在正常范围内
   - 时间与距离匹配
   - 步数和卡路里合理

## 工具类说明

### NetworkTrafficAnalyzer

用于分析网络抓包数据：

```typescript
const analyzer = new NetworkTrafficAnalyzer();
const requests = analyzer.parseTrafficData(pcapData);
const freeRunRequests = analyzer.filterByEndpoint(requests, '/freeRun');
```

### ApiEndpointDiscovery

用于自动发现API端点：

```typescript
const discovery = new ApiEndpointDiscovery();
const endpoints = discovery.discoverEndpoints(requests);
const freeRunEndpoints = discovery.filterFreeRunEndpoints(endpoints);
```

### RequestFormatAnalyzer

用于分析请求格式：

```typescript
const analyzer = new RequestFormatAnalyzer();
const schema = analyzer.analyzeFormat(requests);
const requiredFields = schema.getRequiredFields();
```

### EncryptionVerifier

用于验证加密兼容性：

```typescript
const verifier = new EncryptionVerifier();
const result = verifier.verifyCompatibility(sampleData);
console.log(result.isCompatible); // true
```

## 更新日志

### 2024-12-21
- 初始版本
- 完成API端点发现
- 验证加密兼容性
- 整理数据格式文档

## 参考资料

- [龙猫校园官方文档](https://example.com) (如有)
- [RSA加密算法](https://en.wikipedia.org/wiki/RSA_(cryptosystem))
- [HTTP协议规范](https://tools.ietf.org/html/rfc7231)
