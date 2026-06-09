# Product Requirements Document (PRD): AI-Driven Trading Position Manager

## 1. Overview
The **Trading Position Manager** is an autonomous, agent-driven trading application designed to monitor market indicators, execute long/short positions on the CoinEx exchange, and meticulously manage risk. It operates on timeframes starting from 1 minute and uses a recurrent "Claude Code" session to analyze positions candle-by-candle. The core differentiator of this system is its **highly restricted, customizable risk manager** built strictly upon the mathematical principles of expectancy, variance, and position sizing.

## 2. Objectives
- **Automate Position Management:** Continuously watch open positions on a candle-to-candle basis.
- **Strict Risk Enforcement:** Prevent catastrophic drawdowns by enforcing strict mathematical risk parameters (Standardized Dollar Risk, max 0.25%–2% risk per trade).
- **Customizable Strategies:** Allow users to define trading strategies flexibly using Markdown files.
- **Stateless/Stateful Hybrid AI:** Use Claude (Opus/Sonnet) sessions that wake up periodically, utilizing persistent file-based memory to maintain context of ongoing trades.
- **Easy Deployment & Usage:** Provide a dockerized web application without the friction of authentication, taking the CoinEx API token securely via the UI.
- **Backtesting & Simulation:** Run the strategy in a backtest mode where the system opens mock positions and journals the details without executing live trades on CoinEx.

## 3. Core Features & Requirements

### 3.1. Agentic Trading Engine (Claude Code)
- **Model:** Claude 3 Opus / Claude 3.5 Sonnet (referred to as "Opus 4.8" conceptually for high reasoning).
- **Execution Loop:** The agent operates recurrently. It wakes up at the close of every candle (e.g., every 1m, 5m, 15m), checks the current market data, and decides whether to hold, close, or open a position.
- **Memory Management:** The agent maintains state and memory between sessions using a file-based storage system. It logs its rationale, current PNL, and expected moves, reading this context when it wakes up for the next candle.

### 3.2. Strategy Parsing via Markdown
- **Markdown Strategies:** Trading strategies (indicators, entry/exit conditions) are written in plain Markdown format.
- **Default Strategy (EMA Crossover with Dynamic R:R):** Out of the box, the system comes with a default 9-EMA and 21-EMA crossover strategy. It enters LONG when the 9-EMA crosses above the 21-EMA (and vice-versa for SHORT), sets a stop-loss at the recent swing low/high, and targets a fixed Reward-to-Risk ratio (e.g., a 3R target) as recommended in the trading handbook.
- **Agent Interpretation:** The Claude session reads the Markdown strategy file at the start of its evaluation, interpreting the natural language/pseudo-code rules and applying them to the current candle data.

### 3.3. Highly Restricted Risk Manager
Built on the principles of *"The Math of Winning in Trading"*:
- **Expectancy Tracking:** The system logs Average Win, Average Loss, and Win Rate to calculate the real expectancy over time.
- **Standardized Dollar Risk:** Position sizes are calculated dynamically based on the stop-loss distance. The dollar amount at risk will **never** exceed the user's defined limit (e.g., 1% of the account).
- **Drawdown Protection (Math of Ruin):** Hard stops prevent the system from executing further trades if a daily/weekly drawdown limit is reached.
- **No Gambler's Fallacy:** The system treats every trade as an independent event, refusing to increase risk size to "recover" past losses.

### 3.4. Target Exchange Integration
- **Platform:** CoinEx API.
- **Capabilities:** Fetching ticker data, executing market/limit orders for long and short futures positions, and managing stop-loss/take-profit orders.

### 3.5. Web Application Interface
- **Architecture:** Client-Server model.
- **Authentication:** No authentication required. Designed for local or secured private networking.
- **Initialization:** Upon load, the frontend provides a secure input for the user to submit their CoinEx API Key and Secret.
- **Live Position Charting:** A dedicated interactive chart (e.g., using TradingView Lightweight Charts or similar) that visually plots live market data alongside active positions, entry prices, stop-losses, and take-profit levels.
- **Dashboard:** Displays the interactive chart, active positions list, agent reasoning/logs for the latest candle, current risk metrics, and historical performance.

### 3.6. Storage & Infrastructure
- **Tech Stack:** Node.js for the backend. Vue.js and TailwindCSS for the frontend.
- **File-Based Storage:** All trade histories, session memories, system logs, and performance metrics are stored in local files (e.g., JSON/CSV/MD files). No heavy database is required.
- **Dockerized:** The entire application is packaged into a single Docker compose setup for one-click deployment.

### 3.7. Backtest & Mock Execution Mode
- **Simulation Environment:** The system features a dedicated backtest mode to safely evaluate strategies without risking real capital.
- **Mock Positions:** Instead of hitting the CoinEx live execution endpoints, the agent opens "mock" long/short positions based on its evaluation of the market.
- **Detailed Journaling:** Every mock position, along with the agent's rationale and hypothetical PNL, is meticulously journaled in the file system for user review.

## 4. System Architecture Flow

1. **User Setup:** User launches the Docker container and opens the web UI.
2. **Configuration:** User inputs the CoinEx API credentials and selects/uploads a Markdown strategy file and a Risk parameters file.
3. **Data Ingestion:** The backend uses an **Exchange Adapter Pattern** (initially implementing CoinEx WebSockets) to listen for candle closes on the specified timeframe (>= 1 min). This allows easy integration of other platforms in the future.
4. **Agent Wakeup:** On candle close, the backend compiles the market data, reads the active position data, and wakes up the Claude Code session.
5. **Agent Evaluation:** 
   - Claude reads the memory file from the previous candle.
   - Claude evaluates the new candle against the Markdown strategy.
   - Claude evaluates the Risk Manager constraints.
6. **Execution:** If conditions are met, Claude outputs an action (OPEN, CLOSE, HOLD, ADJUST STOP).
7. **Storage:** The backend executes the API call via the Exchange Adapter, updates the file-based history, and saves Claude's reasoning into the memory file for the next candle.
