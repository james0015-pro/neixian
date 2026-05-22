# 內線 (NeiXian) — Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.
> **For Night Shift:** Autonomous execution — take next pending task, implement, verify, commit.

**Goal:** 建立 SEC 內部人跨公司交易 + 機構重倉排行儀表板（彭博風 + Finviz 篩選器）

**Architecture:** 單頁應用，HashRouter → DashboardPage（四象限：①內部人交易表 ②機構排行  
③詳細面板 ④圖表）。爬蟲數據以 JSON 檔同步 import，避開 async hooks。

**Tech Stack:** React 19 + Vite + TypeScript + Tailwind v3 + Lightweight Charts + HashRouter

---

## Phase 0: Scaffold（腳手架）

### Task 0.1: 建立專案目錄 + 複製 WhaleTrace 基底
**Objective:** 從 WhaleTrace 複製 package.json / vite.config / tailwind / tsconfig / eslint

**Files:**
- Create: `/opt/data/home/projects/neixian/` (entire scaffold)

**Steps:**
1. 複製 `/opt/data/home/whaletrace/` 基礎檔案（package.json, vite.config.ts, tsconfig*.json, eslint*, tailwind.config.js, postcss.config.js, index.html）
2. 移除 WhaleTrace 特有頁面和資料
3. 保留 i18n 設定（zh-TW）
4. `npm install`
5. `npm run build` 驗證骨架可以跑
6. Commit

---

## Phase 1: Dashboard 骨架（Bloomberg 四象限）

### Task 1.1: 創建 DashboardPage 四象限布局
**Files:**
- Create: `src/pages/DashboardPage.tsx`
- Modify: `src/App.tsx` (加 route)

**Layout:**
```
┌──────────────────────────────────────┐
│  Q1: 內部人交易表 (60% 寬) │ Q3: 詳細面板 (40%) │
│                            │              │
├────────────────────────────┼──────────────┤
│  Q2: 機構排行 (60% 寬)    │ Q4: 圖表 (40%) │
│                            │              │
└──────────────────────────────────────┘
```
- 黑底 #000000、琥珀邊框 #ff8c00
- JetBrains Mono 字體
- 鍵盤 1-4 切換象限 focus
- ESC 回主畫面

**Verification:** `npm run build` 通過，打開看到黑底四象限空白框架

---

### Task 1.2: 建立數據類型定義
**Files:**
- Create: `src/types/insider.ts`
- Create: `src/types/institution.ts`

**insider.ts:**
```typescript
export interface InsiderTrade {
  id: string;
  insider_name: string;
  insider_title: string;
  source_company: string;      // 內部人所屬公司
  target_company: string;      // 買入的公司
  target_ticker: string;
  transaction_date: string;
  transaction_type: 'BUY' | 'SELL';
  shares: number;
  price_per_share: number;
  total_value: number;
  shares_held_after: number;
  filing_date: string;
}
```

**institution.ts:**
```typescript
export interface InstitutionHolding {
  id: string;
  institution_name: string;
  ticker: string;
  company_name: string;
  shares_held: number;
  market_value: number;
  change_qoq: number;         // QoQ 變化百分比
  portfolio_weight: number;   // 佔該機構組合比例
  report_date: string;
}
```

---

### Task 1.3: 載入數據 + 顯示 Q1 內部人交易表
**Files:**
- Create: `src/data/insider-trades.json` (初始空陣列)
- Create: `src/components/InsiderTradesTable.tsx`
- Modify: `src/pages/DashboardPage.tsx`

**InsiderTradesTable:**
- Finviz 風格的排序表格（點擊欄位標題排序）
- 欄位：內部人名稱 | 來源公司 | 標的公司(Ticker) | 日期 | 類型 | 金額
- BUY 綠色、SELL 紅色、金額格式化（$1.2B / $450M）
- 點擊任何一列 → 觸發 onSelect(insider) → Q3 顯示詳細面板

**Verification:** `npm run build`，看到 Q1 有空白表格（等待數據）

---

### Task 1.4: Q2 機構排行
**Files:**
- Create: `src/data/institution-holdings.json`
- Create: `src/components/InstitutionRanking.tsx`
- Modify: `src/pages/DashboardPage.tsx`

**InstitutionRanking:**
- 排名表格：機構名稱 | 持有標的 | 市值 | QoQ變化 | 組合權重
- QoQ 用熱力圖色（綠增紅減）
- 點擊 → Q3 顯示該機構詳細

**Verification:** `npm run build`

---

### Task 1.5: Q3 詳細面板（點擊展開）
**Files:**
- Create: `src/components/DetailPanel.tsx`
- Modify: `src/pages/DashboardPage.tsx`

**DetailPanel:**
- 根據點擊的類型（內部人 vs 機構）顯示不同內容
- 內部人模式：
  - 頭像/名稱/職位/所屬公司
  - 10 年交易歷史清單（scrollable）
  - 基本面摘要卡片
- 機構模式：
  - 機構名稱/管理規模
  - 2 年進出歷史
  - 當前重倉標的清單

---

### Task 1.6: Q4 圖表區（Lightweight Charts）
**Files:**
- Create: `src/components/ChartPanel.tsx`
- Modify: `src/pages/DashboardPage.tsx`

**ChartPanel:**
- 內部人模式：交易時間線圖（X=日期 Y=交易金額，BUY綠色/SELL紅色）
- 機構模式：持倉變化面積圖（X=時間 Y=持倉市值）
- 使用 Lightweight Charts（TradingView 同款）

**Dependencies:** `npm install lightweight-charts`

---

## Phase 2: 數據層

### Task 2.1: 建立爬蟲 npm script
**Files:**
- Create: `scripts/scrape-insider.py`
- Create: `scripts/scrape-institution.py`

```python
# scrape-insider.py — 爬 SEC EDGAR / OpenInsider
# 輸出: src/data/insider-trades.json
```

```python
# scrape-institution.py — 爬 Finviz
# 輸出: src/data/institution-holdings.json
```

**Verification:** `python scripts/scrape-insider.py` 產生有效的 JSON

---

### Task 2.2: 加入真實數據樣本（至少 20 筆）
**Objective:** 讓儀表板有東西可以看

---

## Phase 3: 互動與細節

### Task 3.1: 鍵盤快捷鍵系統
**Files:**
- Create: `src/hooks/useKeyboardNav.ts`
- Modify: `src/pages/DashboardPage.tsx`

- `1-4`：切換焦點象限（焦點象限邊框變亮）
- `ESC`：清除選擇，回到主畫面
- `↑↓`：在所選象限內上下導航
- `Enter`：展開選中項目

---

### Task 3.2: 篩選器（Finviz 風格）
**Files:**
- Create: `src/components/FilterBar.tsx`
- Modify: `src/pages/DashboardPage.tsx`

- 內部人交易篩選：交易類型(BUY/SELL/BOTH)、金額範圍、日期範圍
- 機構篩選：QoQ 變化(增/減/全部)、組合權重範圍

---

### Task 3.3: 數值格式化 + 動畫
**Files:**
- Create: `src/lib/format.ts`

- 金額：$1.2B, $450M, $3.5K
- 交易類型：BUY 綠色上行箭頭 ▲，SELL 紅色下行箭頭 ▼
- framer-motion 進場動畫（fade-in + slide-up）

---

## Phase 4: 部署

### Task 4.1: GitHub Pages 部署設定
**Files:**
- Modify: `vite.config.ts` (base: '/neixian/')
- Modify: `package.json` (deploy script)

```bash
npm run build:prod
npx gh-pages -d dist
```

---

### Task 4.2: 封測存取控制（簡單密碼）
**Files:**
- Create: `src/components/PasswordGate.tsx`
- Modify: `src/App.tsx`

最簡單方案：環境變數 `VITE_ACCESS_CODE` → `import.meta.env.VITE_ACCESS_CODE`
封測者輸入密碼才看到內容。

---

## Phase 5: 數據串接（研究班產出後自動填入）

### Task 5.1: n8n 數據中轉 workflow
**Files:**
- 透過 n8n workflow 定期爬取 → 存到 GitHub repo 的 data/ 目錄

---

## 執行順序

```
Phase 0 → Task 0.1（腳手架）
Phase 1 → Tasks 1.1 → 1.2 → 1.3 → 1.4 → 1.5 → 1.6（依序）
Phase 2 → Tasks 2.1 → 2.2（爬蟲 + 樣本數據）
Phase 3 → Tasks 3.1 → 3.2 → 3.3（互動優化）
Phase 4 → Tasks 4.1 → 4.2（部署 + 封測）
Phase 5 → Task 5.1（數據自動化）
```

## 每階段驗收標準

| Phase | 驗收 |
|-------|------|
| 0 | `npm run build` 通過，空白頁面可訪問 |
| 1 | 四象限框架可見，表格有結構，點擊有反應 |
| 2 | 真實數據顯示在 Q1+Q2，至少 20 筆 |
| 3 | 鍵盤導航可用，篩選器運作，動畫流暢 |
| 4 | GitHub Pages 可訪問，封測密碼頁面出現 |
| 5 | 數據自動更新，每日新鮮 |
