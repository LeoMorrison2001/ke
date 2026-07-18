# 小可第三方插件开发

插件目录至少包含 `manifest.json` 与 `uiEntry` 指向的静态页面。通过“应用 → 管理插件 → 导入插件”选择该目录。

`manifest.json` 必填字段：`id`、`name`、`version`、`description`、`entryRouteName`、`uiEntry`、`permissions`、`source`。第三方插件的 `source` 固定为 `third-party`，版本使用 `major.minor.patch`。

可申请权限：`storage.read`、`storage.write`、`user.profile.read`、`memory.read`、`memory.write`、`agent.request`。权限只在用户于插件管理页授予后生效。

将 `plugin-sdk/xiaoke-plugin-sdk.js` 复制到插件目录后，可用 `XiaokePlugin` 调用私有存储、资料、记忆和主 Agent。插件 Agent 使用 `agentCapabilities` 声明能力，并设置 `plugin.onAgentInvoke` 返回 `{ status, replyHint, data? }`。

可直接参考并导入 `plugin-examples/quick-note`。生产插件不应引用插件目录外的资源。
