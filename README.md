# PromptForge

PromptForge 是一个聊天式的 AI 前端生成器：用户输入产品或页面需求，后端通过 LangGraph 编排分析、架构规划和代码生成，前端使用 Sandpack 实时预览生成的 React/TypeScript 项目，并支持查看和下载代码。

当前仓库是前后端分离结构，根目录没有统一的 `package.json`，需要分别安装和启动 `backend`、`frontend`。

## 技术栈

- 前端：Next.js 16、React 19、TypeScript、Tailwind CSS 4、Zustand、Sandpack React、Ant Design X。
- 后端：Node.js、TypeScript、Express、LangChain、LangGraph、Zod、Babel AST 工具、Multer、阿里云 OSS。
- 生成模板：`backend/templates/react-ts/` 内置 React + TypeScript 项目模板，生成结果以 Sandpack 文件映射的形式返回浏览器。

## 部署

前后端同机 Docker Compose、Nginx 反向代理、域名解析和 HTTPS 配置请参阅 [DEPLOYMENT.md](DEPLOYMENT.md)。

## 目录结构

```text
.
├── backend/
│   ├── agents/
│   │   ├── adapters/             # 聊天输入路由适配
│   │   ├── flows/traditional/    # traditional 流程的节点、Prompt 和 Schema
│   │   ├── graphs/               # 主图及组件、页面子图
│   │   ├── shared/               # 跨节点 Prompt 和 Schema
│   │   └── utils/                # 模型、Mock、AST 和代码处理工具
│   ├── routes/                   # Express 路由
│   ├── config/                   # 模型、Mock、OSS 配置
│   ├── mock/                     # 各节点的预置 Mock 结果
│   ├── templates/react-ts/       # 返回给前端的 React TypeScript 模板
│   ├── test/                     # 后端测试/调试脚本
│   ├── app.ts                    # Express 应用及路由挂载
│   └── bin/www.ts                # HTTP 服务启动入口
├── frontend/
│   ├── src/app/                  # Next.js App Router 入口
│   ├── src/components/           # 聊天、思维链、预览和布局组件
│   ├── src/services/             # 后端 API 调用与 SSE 解析
│   ├── src/hooks/                # 聊天、预览等业务 Hook
│   ├── src/store/                # 聊天和 Sandpack 状态
│   ├── src/types/                # TypeScript 类型
│   ├── src/lib/                  # 代码下载等工具
│   ├── src/constants/            # 流程、步骤和服务地址配置
│   └── next.config.ts            # Next.js 配置及 API rewrite
└── AGENTS.md                    # 项目协作与维护约定
```

## 环境变量

后端通过 `dotenv` 读取 `backend/.env`。仓库未提供固定的 Node.js 版本，也没有前端环境变量配置；前端当前将后端地址写在代码中。

| 变量 | 用途 | 说明 |
| --- | --- | --- |
| `PORT` | 后端监听端口 | 未设置时为 `7001` |
| `MOCK_MODE` | 全局 Mock 开关 | 设置为 `true` 时后端强制所有节点使用 Mock；未设置或为其他值时默认使用真实模型，客户端仍可传入 Mock 配置 |
| `MAIN_MODEL_PROVIDER` | 主模型提供商 | 支持 `gpt`、`deepseek`；未设置时默认为 `gpt` |
| `OPENAI_API_KEY` | OpenAI API Key | `MAIN_MODEL_PROVIDER=gpt` 时使用 |
| `OPENAI_BASE_URL` | OpenAI 兼容接口地址 | `MAIN_MODEL_PROVIDER=gpt` 时使用 |
| `OPENAI_MODEL` | OpenAI 模型名 | `MAIN_MODEL_PROVIDER=gpt` 时使用 |
| `OPENAI_REASONING_EFFORT` | OpenAI 推理强度 | 可选值：`none`、`minimal`、`low`、`medium`、`high`、`xhigh`、`max` |
| `DEEPSEEK_API_KEY` | DeepSeek API Key | `MAIN_MODEL_PROVIDER=deepseek` 时使用 |
| `DEEPSEEK_BASE_URL` | DeepSeek 兼容接口地址 | `MAIN_MODEL_PROVIDER=deepseek` 时使用 |
| `DEEPSEEK_MODEL` | DeepSeek 模型名 | `MAIN_MODEL_PROVIDER=deepseek` 时使用 |
| `DEEPSEEK_REASONING_EFFORT` | DeepSeek 推理强度 | 可选值：`none`、`minimal`、`low`、`medium`、`high`、`xhigh`、`max` |
| `ALI_OSS_AK` | 阿里云 OSS Access Key ID | 图片上传接口需要 |
| `ALI_OSS_SK` | 阿里云 OSS Access Key Secret | 图片上传接口需要 |
| `ALI_OSS_ENDPOINT` | OSS Endpoint | 未设置时为 `oss-cn-hangzhou.aliyuncs.com` |
| `ALI_OSS_BUCKET` | OSS Bucket | 图片上传接口需要 |

本地只验证前端界面和生成流程时，可以先在 `backend/.env` 设置 `MOCK_MODE=true`，不填写模型 Key。需要真实生成时，再填写所选模型提供商对应的配置。图片上传还需要完整的 OSS 配置。不要把真实密钥写入提交内容。

## 安装与启动

请使用 `pnpm`，并在两个终端分别启动前后端。

```bash
# 终端一：后端
cd backend
pnpm install
pnpm dev
```

```bash
# 终端二：前端
cd frontend
pnpm install
pnpm dev
```

启动后访问 <http://localhost:3000>。后端默认地址为 <http://localhost:7001>。

后端生产启动命令：

```bash
cd backend
pnpm start
```

后端构建命令为 `pnpm build`，Docker 生产镜像会运行编译后的 `dist/bin/www.js`。

前端生产构建与启动命令：

```bash
cd frontend
pnpm build
pnpm start
```

后端脚本目前只有 `dev`、`start`；前端还提供 `pnpm lint`。后端没有单独声明 `build` 或 `test` 脚本。

## 主要接口

### `GET /`

后端健康检查入口，返回简单的 API 欢迎文本。

### `GET /api/template/react-ts`

读取 `backend/templates/react-ts/` 下的文件，并返回 Sandpack 文件映射：

```json
{
  "/App.tsx": { "code": "..." },
  "/index.tsx": { "code": "..." }
}
```

### `POST /api/chat`

以 Server-Sent Events（SSE）流式返回生成过程。请求体主要字段如下：

```json
{
  "messages": [
    {
      "id": "message-1",
      "role": "user",
      "content": "生成一个小说管理后台"
    }
  ],
  "projectId": "project-xxx-v1",
  "mockConfig": {
    "global": true
  }
}
```

`projectId` 会被用作 LangGraph 的 `thread_id`，用于隔离项目/版本上下文。`mockConfig` 至少可以使用 `global`；后端还支持按 `phases` 或 `nodes` 细分 Mock 开关。

每条 SSE 数据形如 `data: {"type":"...","data":...}`，事件类型包括各生成步骤、`files`、`done` 和 `error`。`files` 事件包含最终的文件映射，前端收到后会更新 Sandpack 预览；流程失败时后端发送 `error`，不会发送 `done`。

### `POST /api/upload/image`

使用 `multipart/form-data` 上传图片，文件字段名必须为 `file`。支持 `.jpg`、`.jpeg`、`.png`、`.gif`、`.webp`、`.svg`，单文件最大 10 MB。上传成功后返回：

```json
{
  "url": "https://...",
  "name": "原始文件名.png"
}
```

该接口会将文件直接上传到阿里云 OSS；OSS 配置缺失时接口不可用。

## 生成流程

当前后端聊天入口只注册了 `traditional` 流程。有效文本提示词会优先匹配 `prompt-route`，否则使用 traditional fallback，随后构建 `backend/agents/graphs/traditional.graph.ts` 中的图，并按以下阶段顺序执行：

| 阶段 | 节点/事件 |
| --- | --- |
| 规划 `planning` | `analysis` → `intent` → `capabilities` → `ui` → `components` → `structure` → `dependency` |
| 基础建设 `foundation` | `types` → `utils` → `mockData` |
| 逻辑构建 `logic` | `service` → `hooks` |
| 视图构建 `view` | `componentsCode` → `pagesCode` → `layouts` → `styles` |
| 应用组装 `assembly` | `app` → `files` |

其中组件和页面代码分别由组件子图、页面子图生成；最后 `assembleNode` 合并模板、生成代码和依赖信息，生成 Sandpack 文件映射。前端负责展示思维链、预览/编辑文件，并可将当前文件打包下载。

## 开发注意事项

- 前端聊天和模板请求默认使用同源 `/api`；本地开发由 `frontend/next.config.ts` rewrite 到后端，生产环境由 Nginx 代理到后端。需要跨域开发时，可通过 `NEXT_PUBLIC_API_BASE_URL` 显式覆盖。
- 建议从 `backend` 目录启动服务。组装节点会按当前工作目录读取 `templates/react-ts/`，从错误目录启动可能导致模板读取失败并触发内置降级模板。
- `MOCK_MODE=true` 会覆盖客户端传入的 Mock 配置并强制全局 Mock；关闭后，前端 Mock 开关会通过请求体传给后端。
- 后端当前 `RouteFlow` 只支持 `traditional`。前端代码中虽然保留了 Figma 流程的类型和展示配置，但后端对应适配器仍未注册，不应将其视为已完成的独立后端流程。
- 后端默认允许本地开发来源，并通过 `CORS_ORIGINS` 增加生产前端来源；生产 Compose 会配置 `https://promptforge.pjhao.xyz`。
- 修改核心业务能力或关键目录结构时维护根目录 `AGENTS.md`；小改动、文案调整和临时修复不写入该文件。
