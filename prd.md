# Product Requirements Document (PRD): AI-Driven Trading Position Manager

## 1. Overview
The **Trading Position Manager** is a multi-agent trading platform for CoinEx futures. The user creates any number of **trading agents**; each agent is an autonomous unit with its own strategy, AI model, timeframe, allocated fund, and risk profile. Agents wake up on every candle close, evaluate the market through a recurrent "Claude Code" session, and open/manage/close long or short positions. The core differentiator is a **highly restricted, customizable risk manager** built strictly on the mathematical principles of expectancy, variance, and position sizing — applied per agent, against that agent's allocated fund.

## 2. Objectives
- **Multi-Agent Operation:** Run several independent agents in parallel, each on its own market, strategy, and timeframe, with isolated capital allocations.
- **Automate Position Management:** Each agent continuously watches its open positions candle-to-candle.
- **Strict Risk Enforcement:** Prevent catastrophic drawdowns with strict math-based risk parameters (Standardized Dollar Risk, max 0.25%–2% risk per trade of the agent's allocation).
- **Customizable Strategies:** Define trading strategies as Markdown documents, managed inside the app.
- **Conversational Control:** Chat with any agent to ask about its positions, reasoning, and performance.
- **Backtesting & Simulation:** Run any agent in mock or backtest mode, journaling everything without touching live capital.
- **Easy Deployment:** Dockerized web app, no authentication, CoinEx API token entered via the UI.

## 3. Core Concept: The Agent
An **agent** is the central entity of the system. Its configuration, chosen at creation time and editable while stopped:

| Field | Description |
|---|---|
| Name | Display name for the agent. |
| Strategy | One of the user-defined Markdown strategies. |
| AI Model | Selectable Claude model (e.g., Opus 4.8, Sonnet 4.6, Haiku 4.5) — trade reasoning cost vs. depth. |
| Market & Timeframe | Trading pair (e.g., BTCUSDT) and candle timeframe (1m, 5m, 15m, 1h, 4h). |
| Allocated Fund | The capital slice this agent manages. All position sizing and drawdown math is computed against this allocation, never the whole account. |
| Risk Profile | Per-trade risk % (0.25–2% of allocation), daily/weekly drawdown limits, max concurrent positions, target R:R. |
| Mode | `mock` (paper trading), `backtest` (historical), or `live` (real CoinEx orders, opt-in). |

Each agent has a lifecycle: **created → running ⇄ stopped**, plus an at-a-glance status (current position, PNL, last action). Agents persist across restarts.

## 4. Core Features & Requirements

### 4.1. Agentic Trading Engine (Claude Code)
- **Execution Loop:** Each running agent wakes at the close of every candle of its timeframe, reads current market data and its own state, and decides: OPEN, CLOSE, HOLD, or ADJUST STOP.
- **Per-Agent Memory:** Each agent keeps its own session memory (rationale, current PNL, expected moves) in the database, read back on the next wakeup. Agents never share memory.
- **Model per Agent:** The Claude model is an agent-level setting, so a fast/cheap model can drive a 1m scalper while a deeper model drives a 4h swing agent.

### 4.2. Strategy Management
- **Markdown Strategies:** Strategies (indicators, entry/exit conditions) are written in plain Markdown and stored in the database.
- **Strategies Page:** A dedicated page to create, edit, and delete strategies with a Markdown editor and preview. A strategy in use by a running agent cannot be deleted.
- **Default Strategy (EMA Crossover with Dynamic R:R):** Ships with a 9/21-EMA crossover strategy — LONG on 9-EMA crossing above 21-EMA (inverse for SHORT), stop at the recent swing low/high, fixed R:R target (e.g., 3R) per the trading handbook.
- **Agent Interpretation:** The Claude session reads its agent's strategy at the start of each evaluation and applies the natural-language/pseudo-code rules to the current candle data.

### 4.3. Highly Restricted Risk Manager (per Agent)
Built on the principles of *"The Math of Winning in Trading"*, scoped to each agent's allocated fund:
- **Expectancy Tracking:** Average Win, Average Loss, and Win Rate logged per agent to compute real expectancy over time.
- **Standardized Dollar Risk:** Position sizes derive from stop-loss distance; the dollar risk never exceeds the agent's per-trade limit (e.g., 1% of its allocation).
- **Drawdown Protection (Math of Ruin):** Hard stops halt an agent when its daily/weekly drawdown limit is hit; the agent transitions to a visible "halted" state.
- **No Gambler's Fallacy:** Every trade is an independent event; an agent never increases risk to "recover" losses.
- **Chat Cannot Override Risk:** Guidance given via chat (see 4.4) may influence strategy interpretation but can never relax the risk limits.

### 4.4. Agent Chat
- **Per-Agent Conversation:** Each agent's page includes a chat panel. The user can ask about open positions, the rationale behind the last action, performance, or market view.
- **Grounded Answers:** The chat session has access to the agent's memory, journal, strategy, and live position data.
- **Soft Guidance:** The user may give directional guidance ("be more conservative this week"); the agent records it in memory and considers it on future candles — always within the hard risk limits.
- **Persistent History:** Chat history is stored per agent in the database.
- **On-Demand Wakeup:** Chat invokes the agent's Claude session immediately, independent of the candle loop.

### 4.5. Exchange Integration
- **Platform:** CoinEx API via an **Exchange Adapter Pattern** (other exchanges pluggable later).
- **Capabilities:** Ticker/candle data (WebSocket candle-close events), market/limit orders for long and short futures, stop-loss/take-profit management.

### 4.6. Web Application Interface
- **Architecture:** Client-server. **Tech stack:** Node.js backend and Vue.js frontend, both written in **TypeScript**; TailwindCSS for styling; Vite as the frontend build tool.
- **Authentication:** None — designed for local or secured private networking. CoinEx API Key/Secret entered via a secure UI input.
- **Pages:**
  1. **Dashboard:** Lists all agents — running and stopped — with status, mode, market/timeframe, allocated fund, open position, PNL, and aggregate account metrics. Entry point to every agent's page.
  2. **Agent Page:** Full detail view per agent: a live interactive chart (TradingView Lightweight Charts or similar) plotting market data **with the strategy's indicators overlaid** (e.g., EMA lines) plus entry, stop-loss, and take-profit levels; the chat panel; the reasoning/journal log; risk metrics and performance history; start/stop controls.
  3. **Create Agent:** A form/wizard to create an agent — pick strategy, AI model, market & timeframe, allocated fund, risk profile, and mode (see §3).
  4. **Strategies Page:** Manage Markdown strategies (see §4.2).

### 4.7. Storage & Infrastructure
- **Database:** MongoDB (an instance is already available; connection string configured via environment variable, e.g. `MONGODB_URI`). Collections: `agents`, `strategies`, `trades`, `agent_memory`, `chat_messages`, `metrics`.
- **Dockerized:** Single Docker Compose setup for one-click deployment; Compose optionally includes a MongoDB service for fresh environments, otherwise the app points at the external instance.

### 4.8. Backtest & Mock Execution Mode
- **Per-Agent Mode:** Mock and backtest are agent-level modes, so a live agent and a paper agent can run side by side.
- **Mock Positions:** In mock/backtest mode the agent opens simulated positions instead of hitting CoinEx execution endpoints.
- **Detailed Journaling:** Every mock position, with rationale and hypothetical PNL, is journaled in the database for review on the agent's page.

## 5. System Architecture Flow

1. **User Setup:** User launches the Docker container, opens the web UI, and enters CoinEx API credentials.
2. **Strategy Definition:** User creates/edits Markdown strategies on the Strategies page (or uses the default EMA crossover).
3. **Agent Creation:** User clicks "Create Agent", selects strategy, AI model, market/timeframe, allocated fund, risk profile, and mode, then starts the agent.
4. **Data Ingestion:** The backend's Exchange Adapter (CoinEx WebSockets) listens for candle closes on each running agent's timeframe.
5. **Agent Wakeup:** On candle close, the backend compiles market data plus the agent's position state and memory, and wakes the agent's Claude session.
6. **Agent Evaluation:** Claude reads its memory and any chat guidance, evaluates the new candle against the strategy, then checks the Risk Manager constraints.
7. **Execution:** If conditions are met, Claude outputs an action (OPEN, CLOSE, HOLD, ADJUST STOP); the backend executes it via the Exchange Adapter (or simulates it in mock mode).
8. **Storage:** Trade history, reasoning, and memory are written to MongoDB; the dashboard and agent pages update live.
9. **Interaction:** At any time the user chats with an agent on its page; the conversation is persisted and feeds back into the agent's memory.
