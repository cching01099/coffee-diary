# 週末咖啡日誌（React + Tailwind + Vite）

## 開始使用

```bash
npm install
npm run dev      # 開發模式，預設 http://localhost:5173
npm run build    # 產生正式環境的 dist/ 資料夾
```

## 專案結構

```
src/
├── main.jsx                 進入點
├── App.jsx                  分頁切換（日曆/採購/統計）
├── index.css                Tailwind 指令
├── hooks/
│   └── useCoffeeData.js     所有資料狀態集中在這裡（entries/purchases），之後接 Supabase 主要改這個檔案
├── lib/
│   └── utils.js             日期格式化、千分位、週期篩選等共用函式
├── components/
│   ├── BottomTabBar.jsx
│   ├── OptionGrid.jsx        咖啡豆品牌／拉花圖案的選項磚塊（含「＋新增」）
│   ├── PhotoDrop.jsx         照片上傳／預覽／更換／移除
│   ├── AddCupSheet.jsx       新增/編輯一杯的表單
│   └── AddPurchaseSheet.jsx  新增/編輯採購的表單
└── pages/
    ├── CalendarPage.jsx
    ├── PurchasesPage.jsx
    └── StatsPage.jsx
```

## 目前狀態

跟 vanilla 版一樣，資料只存在 React state（`useCoffeeData` hook 裡），重新整理頁面會重置成種子資料。這是刻意的 —— 讓你在接 Supabase 之前，先確認功能和互動邏輯沒問題。

## 接 Supabase 的建議順序

1. 先在 `src/lib/supabase.js` 建立 client：
   ```js
   import { createClient } from '@supabase/supabase-js'
   export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)
   ```
   （`@supabase/supabase-js` 已經在 `package.json` 裡了）

2. 加 `.env` 檔（記得加進 `.gitignore`）：
   ```
   VITE_SUPABASE_URL=你的專案網址
   VITE_SUPABASE_ANON_KEY=你的 anon key
   ```

3. 改 `src/hooks/useCoffeeData.js`：
   - 把 `useState(seedEntries)` / `useState(seedPurchases)` 改成 `useState({})` / `useState([])`，並加一個 `useEffect` 在掛載時打 `supabase.from('coffee_logs').select()` 抓資料
   - `addLog`/`updateLog`/`deleteLog`/`addPurchase`/... 這幾個函式，維持相同的參數與呼叫方式（外部元件完全不用改），但函式內部改成呼叫 `supabase.from(...).insert/update/delete(...)`，成功後再更新本地 state（或直接用 Supabase 的 realtime 訂閱自動同步）
   - 照片上傳：`PhotoDrop.jsx` 目前用 `FileReader` 轉成 base64 存在 state 裡；改成呼叫 `supabase.storage.from('coffee-photos').upload(...)`，把回傳的公開網址存進 `photo` 欄位即可，`PhotoDrop` 元件本身不用改

4. 加登入：建議另外包一個 `AuthGate.jsx`，未登入時顯示登入畫面（Google 登入最快），登入後才渲染 `<App />`，並把 `user.id` 傳進 `useCoffeeData`，查詢時加上 `.eq('user_id', user.id)`

資料表建議結構可以參考先前 vanilla 版 README 裡列的 SQL，欄位對應方式完全相同。
