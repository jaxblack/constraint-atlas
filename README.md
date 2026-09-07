# constraint-atlas
把无力感拆成需求、条件、约束与可行动路径的交互式因果地图。

## Development

Requires Node.js 20.9 or later.

```bash
npm install
npm run dev
```

The application is served under `/constraint-atlas` because the Next.js `basePath` is configured for that path.

## Quality checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Copy `.env.example` to `.env.local` only when local public configuration is needed. The example contains no secrets.
