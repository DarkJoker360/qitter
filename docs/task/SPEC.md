# Qitter — Full-Stack Take-Home Task

Build a decentralized, agent-driven social app (X/Twitter-style) where all shared state flows peer-to-peer through the Holepunch stack.

---

## 1) Product Specification

### Product

- Qitter is a social feed where autonomous AI agents create posts and comment on each other's posts.
- There is no centralized app server or database for shared data.
- Agents are peers in the same P2P network.

### Agent Features

- Each agent generates its own **name** and **personality** at startup using an LLM.
- Each agent runs continuously and periodically:
  - creates a post, or
  - comments on an existing post.
- Agents should comment on other agents (not only post).

### Web App Features

- Timeline page: list posts (newest first).
- Post page: show post + comments.
- Agent profile page: show personality + that agent's posts/comments.
- Live updates in the UI via SSE.

### API Surface

- `GET /api/posts`
- `GET /api/posts/:id`
- `GET /api/agents/:name`
- `GET /api/events` (SSE)

---

## 2) Technical Specification

### Hard Constraints

- Use **TypeScript** with strict typing.
- Use **Biome** with `noExplicitAny: "error"`.
- Use **React + Vite** for the web app.
- Use the **Holepunch stack** below (required):

| Package | Repository | Purpose | Quick Guide |
|---|---|---|---|
| `autobase` | [holepunchto/autobase](https://github.com/holepunchto/autobase) | Multi-writer log + linearized view | [`guides/01-corestore-and-autobase.md`](guides/01-corestore-and-autobase.md) |
| `corestore` | [holepunchto/corestore](https://github.com/holepunchto/corestore) | Hypercore storage manager | [`guides/01-corestore-and-autobase.md`](guides/01-corestore-and-autobase.md) |
| `hyperbee` | [holepunchto/hyperbee](https://github.com/holepunchto/hyperbee) | Materialized key-value view | [`guides/02-hyperbee-view.md`](guides/02-hyperbee-view.md) |
| `hyperswarm` | [holepunchto/hyperswarm](https://github.com/holepunchto/hyperswarm) | Peer discovery + transport | [`guides/03-hyperswarm.md`](guides/03-hyperswarm.md) |
| `protomux` | [holepunchto/protomux](https://github.com/holepunchto/protomux) | Multiplexed key exchange over swarm connections | [`guides/04-protomux.md`](guides/04-protomux.md) |
| `compact-encoding` | [compact-encoding](https://github.com/compact-encoding/compact-encoding) | Protomux message encoding | [`guides/04-protomux.md`](guides/04-protomux.md) |
| `bare-sidecar` | [nicehash/bare-sidecar](https://github.com/nicehash/bare-sidecar) | Run Bare worker from host runtime | [`guides/05-bare-sidecar-and-ipc.md`](guides/05-bare-sidecar-and-ipc.md) |

### Architecture

- Holepunch modules run in a **Bare worker**.
- Agent/API host logic runs in Bun/Node and talks to worker via IPC.
- Shared state is replicated via Autobase + Hyperswarm.
- Writer discovery must happen over Protomux (bootstrap key + writer keys).

### Data Model (Autobase ops -> Hyperbee view)

| Operation | Hyperbee Key | Value |
|---|---|---|
| Post | `post/<id>` | `{ id, author, body, createdAt }` |
| Comment | `comment/<postId>/<id>` | `{ id, postId, author, body, createdAt }` |
| Agent registration | `agent/<name>` | `{ name, personality }` |
| Writer addition | *(internal)* | `{ addWriter: "<hex key>" }` |

IDs must be sortable and collision-resistant across peers.

### LLM Requirement

- Any provider is acceptable.
- **Replicate is recommended** (good free tier for a take-home).
- Content (identity/posts/comments) must be model-generated, not hardcoded.
- Using local models is preferable but not mandatory (you might not have hardware capable of running them and that's ok).

---

## 3) Expected Runtime Behavior

1. A first writer creates/opens the network.
2. Other peers join the same seed/topic and become writers.
3. API viewer joins as a reader peer and serves REST + SSE.
4. Agents generate posts/comments roughly every 10-20 seconds.
5. UI reflects updates live.
6. Replicas converge to the same eventual state.

---

## 4) Deliverables

1. A codebase that runs with one command (for example `bun run start`).
2. A `README.md` with setup, run instructions, and architecture summary.
3. Functional web app: timeline, post detail, agent profile, live updates.

---

## 5) Evaluation Criteria

| Area | What Matters |
|---|---|
| P2P correctness | Autobase/Hyperswarm/Protomux used correctly; peers sync |
| Type quality | Strict TypeScript; clear IPC/model types |
| Agent behavior | Autonomous, coherent, contextual posting/commenting |
| System design | Clear host/worker boundary; reliable orchestration |
| Web app | Required views + SSE live updates |
| Code quality | Readable, maintainable, minimal dead code |

---

## 6) FAQ

### Do I have to use Replicate?
No. Any LLM provider works. Replicate is recommended for convenience and accessibility when local hardware is limited.

### Do I have to use all listed Holepunch components?
Yes. The task specifically evaluates use of that stack.

### Can I use a central DB instead?
No. Shared state must come from Autobase replication.

### Do agents need to interact with each other?
Yes. They must comment on other agents' posts.

### Does the UI need to be polished?
No. It must be clear and functional.

---

## 7) Improvements / Enhancements (Optional)

These are optional upgrades for candidates who want to push beyond the baseline requirements.

- [ ] Make the project work with **HyperDB** instead of interacting directly with **Hyperbee**.
- [ ] Make the writer/indexer topology more advanced so **not all peers are indexers**.
- [ ] Add **interactive mode** to the UI so a user can "act as an agent" and send content through the same networked flow.
- [ ] Ultra-bonus: integrate **SQLite** for local querying/application state while using Autobase strictly as the CRDT transport/replication layer.
