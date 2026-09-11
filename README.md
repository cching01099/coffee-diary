# Pourista（React + Tailwind + Vite + Supabase）

## 開始使用

```bash
npm install
npm run dev      # 開發模式，預設 http://localhost:5173
npm run build    # 產生正式環境的 dist/ 資料夾
```

需要先設定環境變數，見下方「Supabase 設定」。

## 專案結構

```
src/
├── main.jsx                    進入點，render <AuthGate />
├── App.jsx                     登入後的主畫面：頂部列 + 分頁切換（日曆/採購/統計）+ 底部 tab bar
├── index.css                   Tailwind 指令
├── lib/
│   ├── supabase.js              Supabase client（讀 .env 的 URL / anon key）
│   └── utils.js                 日期格式化、千分位、週期篩選等共用函式
├── hooks/
│   └── useCoffeeData.js         資料存取層：entries/purchases/選項 都是打 Supabase，CRUD 失敗會回傳 error 讓呼叫端顯示訊息
├── components/
│   ├── AuthGate.jsx              追蹤登入狀態，未登入顯示 LoginPage，登入後渲染 <App user={session.user} />
│   ├── LoginPage.jsx             登入頁：Google OAuth + Email/密碼
│   ├── AccountMenu.jsx           右上角頭像選單（顯示 email、登出）
│   ├── BottomTabBar.jsx
│   ├── OptionGrid.jsx            咖啡豆品牌／拉花圖案的選項磚塊（含「＋新增」）
│   ├── PhotoDrop.jsx             照片上傳／預覽／拖曳調整裁切位置／更換／移除
│   ├── AddCupSheet.jsx           新增/編輯一杯的表單（含儲存中/刪除中狀態）
│   └── AddPurchaseSheet.jsx      新增/編輯採購的表單（可選日期，含儲存中/刪除中狀態）
└── pages/
    ├── CalendarPage.jsx
    ├── PurchasesPage.jsx
    └── StatsPage.jsx

supabase/
└── schema.sql                  資料表 + RLS 規則 + grant 權限，新專案第一次要在 Supabase SQL Editor 完整執行一次
```

## 目前狀態

已經接上 Supabase：Google / Email 登入、entries（每杯記錄）與 purchases（採購記錄）都存在 Postgres，並用 Row Level Security 確保每個人只能讀寫自己的資料。照片目前是轉成 base64 存在 `entries.photo` 欄位裡（還沒接 Supabase Storage），小量使用沒問題，但照片一多資料表會變大，之後有需要可以再改成上傳到 Storage bucket。

## Supabase 設定

1. 在專案根目錄建立 `.env`（已在 `.gitignore`，不會被 commit）：
   ```
   VITE_SUPABASE_URL=你的專案網址
   VITE_SUPABASE_ANON_KEY=你的 anon / publishable key
   ```

2. 在 Supabase Dashboard → SQL Editor 執行整份 [`supabase/schema.sql`](supabase/schema.sql)（只有全新專案第一次要跑完整份；之後的異動都是個別的 `alter table` 增量修改）。

3. Authentication → Providers 開啟 Google（需要在 Google Cloud Console 建 OAuth Client，redirect URI 填 `<你的 Supabase URL>/auth/v1/callback`）。

4. 部署到正式環境（例如 Vercel）後，記得回 Authentication → URL Configuration 把正式網址加進 Redirect URLs 允許清單，不然 OAuth 登入完轉址會失敗。
