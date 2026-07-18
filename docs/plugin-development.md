# 小可第三方应用开发指南

小可将第三方扩展作为“应用”呈现。应用运行在隔离的 iframe 中，不能访问 Node.js、Electron API、宿主页面 DOM 或其他应用的数据；它只能通过 SDK 调用平台明确提供的 bridge。

## 1. 最小目录

```text
my-application/
├─ manifest.json
├─ index.html
└─ xiaoke-plugin-sdk.js
```

`index.html`、SDK、样式、图片等所有运行资源都必须放在应用目录内，并使用相对路径引用。不要引用本机绝对路径，也不要依赖父目录文件。

在小可中打开“应用 → 管理应用 → 导入应用”，选择这个目录即可安装。应用安装后可启动、关闭或卸载；关闭不会删除数据，卸载会永久删除该应用的程序文件与全部私有数据。

## 2. manifest.json

每个第三方应用都需要一个 manifest：

```json
{
  "id": "example.my-application",
  "name": "我的应用",
  "version": "1.0.0",
  "description": "一句话说明应用的用途。",
  "entryRouteName": "plugin-host",
  "uiEntry": "index.html",
  "permissions": ["storage.read", "storage.write"],
  "source": "third-party"
}
```

字段规则：

| 字段 | 要求 |
| --- | --- |
| `id` | 全局唯一；仅小写字母、数字、`.`、`-`，例如 `example.weight-manager`。安装后不要修改。 |
| `name` / `description` | 用户在应用页面看到的名称和介绍。 |
| `version` | 语义化版本，如 `1.0.0`。 |
| `entryRouteName` | 第三方应用固定填写 `plugin-host`。 |
| `uiEntry` | 应用目录内的相对入口路径，通常为 `index.html`；不可使用 `..`、反斜杠或绝对路径。 |
| `source` | 第三方应用固定填写 `third-party`。 |
| `permissions` | 应用将使用的平台能力声明。只声明真正需要的能力。 |

当前支持的能力声明包括：

| 声明 | SDK 对应能力 |
| --- | --- |
| `storage.read` | `plugin.storage.get(key)` |
| `storage.write` | `plugin.storage.set(key, value)`、`plugin.storage.delete(key)` |
| `user.profile.read` | `plugin.getUserProfile()` |
| `memory.read` | `plugin.getConversationMemory()` |
| `agent.request` | `plugin.askAgent(prompt)` |

平台不会再显示逐项授权界面：应用在 manifest 中声明并且处于“启动”状态时，即可使用对应 bridge。未声明的能力仍会被主进程拒绝。`memory.write` 是预留声明，当前 SDK 尚未提供直接写入记忆的接口。

## 3. 使用 SDK 与私有存储

将 [`plugin-sdk/xiaoke-plugin-sdk.js`](plugin-sdk/xiaoke-plugin-sdk.js) 复制到应用目录，再从页面导入：

```html
<script type="module">
  import { XiaokePlugin } from './xiaoke-plugin-sdk.js'

  const plugin = new XiaokePlugin()
  const draft = await plugin.storage.get('draft')
  await plugin.storage.set('draft', { text: '明天上午十点开会' })
  await plugin.storage.delete('draft')
</script>
```

私有存储以“应用 ID + 用户 ID + key”隔离。key 必须是 1–128 个字符，单个值序列化后不能超过 100 KB。存储方法均为异步，应使用 `await` 和 `try/catch`；不要把密码、访问令牌或其他敏感机密写入日志或页面。

其他 bridge 用法：

```js
const profile = await plugin.getUserProfile()
const conversations = await plugin.getConversationMemory()
const result = await plugin.askAgent('请把这段内容整理为待办：...')
```

`askAgent()` 会创建一次独立的主 Agent 请求，prompt 最长 4000 个字符。不要把它放在页面加载、输入事件或循环中自动触发，必须由明确的用户动作发起。

## 4. 跟随深色 / 浅色主题

隔离 iframe 不能读取宿主的 CSS 变量。SDK 会在加载时和主题变化时调用监听器：

```js
plugin.onThemeChange((theme) => {
  document.documentElement.dataset.theme = theme // 'light' 或 'dark'
})
```

应用自身用 CSS 变量定义两套颜色：

```css
:root { --page: #fff; --text: #252525; --border: #e3e6ea; color: var(--text); color-scheme: light; }
:root[data-theme='dark'] { --page: #181818; --text: #e4e8ee; --border: #404040; color-scheme: dark; }
body { color: var(--text); background: var(--page); }
```

不要把页面背景、输入框、边框、文字全部写死为浅色；深色主题下要同时覆盖表单、空状态、卡片和悬停状态。完整写法可参考体重管理示例。

## 5. 让主 Agent 调用应用

若希望用户能说“帮我记录今天体重 62.5 kg”，在 manifest 中增加 `agentCapabilities`。每项能力需要清晰的名称、供模型理解的描述、JSON Schema 输入和所需能力声明：

```json
{
  "agentCapabilities": [{
    "id": "weight.record",
    "name": "记录体重",
    "description": "记录或修改用户明确提供的指定日期体重，单位为 kg。",
    "inputSchema": {
      "type": "object",
      "properties": {
        "date": { "type": "string", "pattern": "^\\d{4}-\\d{2}-\\d{2}$" },
        "weightKg": { "type": "number", "minimum": 1, "maximum": 500 }
      },
      "required": ["date", "weightKg"],
      "additionalProperties": false
    },
    "permissions": ["storage.write"]
  }]
}
```

页面加载后立即注册处理函数，**不要先等待网络、存储或用户资料读取**：

```js
plugin.onAgentInvoke = async (capabilityId, input) => {
  if (capabilityId !== 'weight.record' || !input || typeof input !== 'object') {
    return { status: 'failed', replyHint: '不支持的操作。' }
  }

  const { date, weightKg } = input
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Number(weightKg))) {
    return { status: 'failed', replyHint: '日期或体重无效。' }
  }

  await plugin.storage.set('weights', { [date]: Number(weightKg) })
  return { status: 'completed', replyHint: `已记录 ${date} 的体重。` }
}
```

返回值必须是 `{ status, replyHint, data? }`：

- `status` 只能是 `completed`、`needs_input`、`needs_confirmation`、`failed`。
- `replyHint` 必须是简短的、可展示给用户的结果说明，最长 4000 字符。
- `data` 可选，序列化后最大 32 KB。
- 第三方应用 Agent 不能直接返回导航或其他 UI 动作。

平台对每个应用最多同时执行 2 个 Agent 调用、每分钟最多 20 次、单次等待最多 30 秒。能力描述和输入 Schema 应尽量具体；涉及删除、覆盖、外部发送等不可逆动作时，先返回 `needs_confirmation`，不要直接执行。

## 6. 开发与发布注意事项

1. 不信任来自页面输入、主 Agent 输入和 bridge 返回的任何数据，先做类型、长度和业务范围校验。
2. 应用在 sandbox iframe 内运行；不要尝试使用 `require`、`process`、Node.js、Electron 或访问父页面 DOM。
3. bridge 只处理 SDK 提供的受控请求。不要自行伪造未声明能力的请求，主进程会拒绝。
4. `postMessage` 是底层实现细节，业务应用应只通过 SDK 调用 bridge；升级 SDK 时一并更新应用内副本。
5. 不要在应用中加载不受控的远程脚本。生产包应包含固定版本的本地资源，并避免符号链接。
6. 修改 manifest、SDK 或页面后，需要卸载并重新导入该应用；已安装应用是导入时的副本。
7. 用浅色和深色主题各检查一次：首次打开、关闭再启动、私有数据读写、主 Agent 调用、卸载后的数据清理。

## 7. 可导入示例

- [`plugin-examples/quick-note`](plugin-examples/quick-note)：最小的私有存储、用户资料、主 Agent 请求和 Agent 能力示例。
- [`plugin-examples/weight-manager`](plugin-examples/weight-manager)：完整的表单、编辑历史、私有存储、主题适配和“记录体重”Agent 能力示例。
