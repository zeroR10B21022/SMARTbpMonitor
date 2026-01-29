# 🚦 血壓紅黃綠燈 - Blood Pressure Traffic Light System

智能血壓監測與管理系統 - 獨立 HTML 版本

## 快速開始 Quick Start

### 方法 1: 直接開啟檔案
1. 找到 `index.html` 檔案
2. 雙擊開啟（或右鍵 → 選擇瀏覽器開啟）
3. 選擇連接選項：
   - **連接到 Taiwan HAPI FHIR 伺服器** - 使用真實 FHIR 測試伺服器
   - **使用 Demo 模式** - 使用本地儲存和測試資料

### 方法 2: 使用本地伺服器（推薦）
```bash
# 使用 Python 3
cd BP-Traffic-Light-HTML
python -m http.server 8000

# 或使用 Python 2
python -m SimpleHTTPServer 8000

# 然後在瀏覽器開啟
# http://localhost:8000
```

## 功能特色 Features

### ✅ 血壓分類系統
- 🟢 **綠燈**: 血壓正常（收縮壓 < 140 且 舒張壓 < 90）
- 🟡 **黃燈**: 血壓偏高（收縮壓 ≥ 140 或 舒張壓 ≥ 90）
- 🔴 **紅燈**: 血壓過高（收縮壓 ≥ 160 或 舒張壓 ≥ 100）

### 📊 儀表板功能
- 即時血壓燈號顯示
- 紅黃綠燈分布統計
- 血壓趨勢圖表（最近 30 筆記錄）
- 動畫效果與視覺回饋

### 📝 輸入血壓
- 簡易血壓輸入介面
- 收縮壓 / 舒張壓數值驗證
- 自動設定測量時間
- 支援自訂測量時間
- **📱 智慧手錶資料匯入** (NEW!)
  - 支援 JSON 格式匯入
  - 自動去除重複記錄
  - 批次匯入血壓資料
  - 支援多種智慧手錶品牌（Apple Watch, Fitbit, Garmin 等）
  - 詳見 [IMPORT_GUIDE.md](IMPORT_GUIDE.md)

### 📜 歷史紀錄
- 完整血壓記錄列表
- 顯示測量時間與分類狀態
- 最近 50 筆記錄
- 可排序與篩選

### ⚙️ 設定
- 可調整紅燈閾值（預設：收縮壓 ≥ 160 或 舒張壓 ≥ 100）
- 可調整黃燈閾值（預設：收縮壓 ≥ 140 或 舒張壓 ≥ 90）
- 重置為預設值功能
- 閾值儲存在瀏覽器本地

## 連接模式 Connection Modes

### 🌐 FHIR 模式 (Taiwan HAPI FHIR Server)
- **伺服器**: https://twcore.hapi.fhir.tw/fhir
- **特點**:
  - 使用真實 FHIR R4 測試伺服器
  - 支援讀取與寫入 FHIR Observation 資源
  - 無需 OAuth 認證（公開測試伺服器）
  - 資料儲存在 FHIR 伺服器
- **適用於**: 測試 FHIR 整合、學習 FHIR 標準

### 💾 Demo 模式 (Local Storage)
- **儲存位置**: 瀏覽器本地儲存 (localStorage)
- **特點**:
  - 完全離線運作
  - 資料僅存在您的瀏覽器
  - 自動生成 30 天範例資料
  - 清除瀏覽器資料會遺失記錄
- **適用於**: 快速展示、離線使用、隱私優先

## 技術規格 Technical Specifications

### 前端技術
- **HTML5**: 語意化標籤、離線支援
- **Bootstrap 5.3.2**: RWD 響應式設計
- **Chart.js 4.4.1**: 互動式血壓趨勢圖
- **Vanilla JavaScript**: 無需額外依賴

### FHIR 標準
- **FHIR 版本**: R4 (4.0.1)
- **資源類型**: Observation (Blood Pressure Panel)
- **LOINC 代碼**:
  - `85354-9`: Blood pressure panel
  - `8480-6`: Systolic blood pressure
  - `8462-4`: Diastolic blood pressure

### 瀏覽器支援
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ⚠️ 需要 JavaScript 啟用
- ⚠️ 需要 localStorage 支援

## 檔案結構 File Structure

```
BP-Traffic-Light-HTML/
├── index.html          # 主要 HTML 檔案
├── app.js              # JavaScript 應用程式邏輯
└── README.md           # 說明文件
```

## 資料隱私 Data Privacy

### FHIR 模式
- 資料儲存在 Taiwan HAPI FHIR 測試伺服器
- 這是公開測試環境，**請勿輸入真實患者資料**
- 測試資料可能定期清除

### Demo 模式
- 資料僅儲存在您的瀏覽器 localStorage
- 不會傳送到任何伺服器
- 清除瀏覽器資料會遺失記錄
- 適合隱私保護需求

## 使用限制 Limitations

1. **FHIR 模式**: Taiwan HAPI 為測試伺服器，請勿用於生產環境
2. **Demo 模式**: 資料不會同步到其他裝置或瀏覽器
3. **無使用者認證**: 任何人都可存取測試資料
4. **無資料加密**: 本地儲存未加密
5. **單一患者**: 每次僅能管理一位患者的資料

## 常見問題 FAQ

### Q: 資料會不會遺失？
A:
- **FHIR 模式**: 資料儲存在伺服器，但測試伺服器可能定期清除
- **Demo 模式**: 資料在瀏覽器 localStorage，清除瀏覽器資料會遺失

### Q: 可以用於真實患者嗎？
A: **不建議**。這是測試應用程式，Taiwan HAPI 是公開測試環境。真實臨床應用需要：
- 正式 FHIR 伺服器
- OAuth 2.0 認證
- 資料加密
- 符合醫療法規

### Q: 為什麼 FHIR 連接失敗？
A: 可能原因：
1. 網路連線問題
2. Taiwan HAPI 伺服器維護中
3. 瀏覽器 CORS 限制（使用本地伺服器可解決）
4. 防火牆阻擋

### Q: 可以更改閾值嗎？
A: 可以！前往「設定」頁面調整紅燈、黃燈閾值。

### Q: 支援手機瀏覽器嗎？
A: 支援！使用 Bootstrap RWD 設計，在手機、平板、桌面都可正常使用。

## 臨床指引 Clinical Guidelines

### ICH 術後血壓管理參考
- **超急性期（< 24小時）**: 收縮壓目標 140-160 mmHg
- **急性期（1-7天）**: 收縮壓目標 < 140 mmHg
- **亞急性期（> 7天）**: 逐步調整至長期目標

⚠️ **重要提醒**:
- 本系統為教育與示範用途
- 臨床決策需由醫師根據個別患者狀況判斷
- 請勿僅依賴本系統進行醫療決策

## 開發資訊 Development

### 作者
- 萬芳醫院腦神經外科
- 鄔雨銘醫師

### 版本
- v1.0.0 (2025-01-28)

### License
- MIT License (教育與研究用途)

### 相關專案
- Python/Streamlit 版本: https://github.com/zeroR10B21022/WFtmuFHIR
- 完整 ich_bp_agent 專案: https://github.com/zeroR10B21022/ich_bp_agent

## 技術支援 Support

如有問題或建議，請透過以下方式聯繫：
- Email: 114346@w.tmu.edu.tw
- GitHub Issues: [專案 GitHub 頁面]

---

**免責聲明**: 本系統僅供教育、研究與示範用途。臨床醫療決策需由合格醫師根據個別患者情況判斷。開發者不對使用本系統產生的任何後果負責。
