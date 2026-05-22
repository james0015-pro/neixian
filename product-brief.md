# 內線 (NeiXian) — Product Brief

## 一句話
追蹤 SEC 內部人跨公司買股 + 機構重倉排行的彭博風篩選儀表板

## 核心使用者 + 問題
- **使用者**：你自己 + 封測小圈
- **問題**：想知道誰（內部人）在買什麼（別家公司股票），以及機構把錢押在哪裡
- **場景**：每天打開快速掃一眼，發現異常就深入追查

## 主要流程
1. 打開儀表板 → 上半部：今日內部人跨公司交易
2. 下半部：機構持倉排行（金額最大）
3. 點擊任何一筆 → 展開該內部人/機構的詳細面板
   - 內部人：過去 10 年交易歷史
   - 基本面：Morningstar 級財報數據
   - 技術線圖：Lightweight Charts

## 功能優先級
| P0 | P1 | P2 |
|----|----|-----|
| 內部人跨公司交易表 | 10 年歷史展開 | 封測存取控制 |
| 機構重倉排行 | 技術線圖 | 異常信號標記 |
| 點擊展開詳細面板 | Morningstar 級財報 | 通知推送 |

## 產品氣質
- **主畫面**：Bloomberg Terminal（黑底 #000、琥珀 #ff8c00、JetBrains Mono）
- **篩選器**：Finviz 風格（排序、過濾、熱力圖）
- **布局**：四象限固定網格、ESC 回主畫面、鍵盤 1-4 切換象限

## 資料來源
- SEC EDGAR Form 4 → 內部人交易
- Finviz → 機構持股
- 爬蟲 → JSON 檔直接 import（免 async hooks）

## 平台
- MVP：純網頁（桌面優先）
- 未來：手機版

## 技術棧
- React 19 + Vite + TypeScript + Tailwind v3
- Lightweight Charts（TradingView 同款）
- HashRouter + GitHub Pages 部署
- 爬蟲 → JSON 直接 import（同步載入）

## 非目標
- 無底線（可自由演化）

## 開放問題
- 內部人交易資料的爬蟲目標網站：OpenInsider？直接 SEC EDGAR？
- 機構持股：Finviz？WhaleWisdom？
- 是否需要 n8n workflow 做數據中轉？
