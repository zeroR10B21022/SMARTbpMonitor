# SMART BP Monitor 開發文檔

## 專案概述

這是一個基於 SMART on FHIR 標準的血壓監測應用程式，可與台灣衛福部 (MOHW) FHIR Sandbox 整合，從電子病歷系統 (EHR) 讀取病患資料。

### 主要功能

1. **血壓記錄與分類** - 根據血壓值顯示紅綠燈警示
2. **SMART on FHIR 整合** - 從 EHR 系統讀取/寫入血壓資料
3. **病患資料查看** - 顯示病患基本資料、診斷、用藥、檢驗報告、生命徵象
4. **閾值鎖定** - 密碼保護的血壓分類閾值設定
5. **Demo 模式** - 無需 EHR 連線的展示模式

---

## 檔案結構

```
BP-Traffic-Light-HTML/
├── index.html      # 主應用程式頁面
├── launch.html     # SMART on FHIR OAuth 啟動頁面
├── app.js          # 主要應用程式邏輯
├── styles.css      # 樣式表
└── DEVELOPMENT.md  # 本文檔
```

---

## 技術架構

### SMART on FHIR 流程

```
[EHR System] → [launch.html] → [OAuth2 Authorization] → [index.html]
     ↓              ↓                    ↓                    ↓
  提供 ISS      處理啟動參數        取得 Access Token      應用程式運行
```

### 關鍵技術

- **FHIR Client JS**: `https://cdn.jsdelivr.net/npm/fhirclient/build/fhir-client.js`
- **Bootstrap 5**: UI 框架
- **Chart.js**: 血壓趨勢圖表
- **localStorage**: 本地資料儲存

---

## 核心檔案說明

### launch.html

**用途**: SMART on FHIR OAuth2 啟動入口

**運作方式**:
1. 檢查 URL 是否有 `iss` 參數（由 EHR 提供）
2. 有 `iss`: 執行 `FHIR.oauth2.authorize()` 開始 OAuth 流程
3. 無 `iss`: 顯示手動啟動選項（前往 MOHW Sandbox 或 Demo 模式）

**關鍵程式碼**:
```javascript
if (issFromUrl) {
    // EHR 啟動 - 執行 OAuth
    FHIR.oauth2.authorize({
        clientId: "smart_bp_monitor",
        scope: "launch openid fhirUser patient/*.read patient/Observation.write",
        redirectUri: "index.html"
    });
} else {
    // 顯示手動選項
    document.getElementById('manualLaunch').style.display = 'block';
}
```

### index.html

**用途**: 主應用程式 UI

**主要區塊**:
- **Dashboard**: 血壓紅綠燈顯示、最新數值
- **輸入血壓**: 手動輸入收縮壓/舒張壓/脈搏
- **歷史紀錄**: 血壓趨勢圖表與列表
- **設定**: 閾值設定、鎖定功能、連線狀態
- **病患資料**: 完整病患資訊（SMART/Demo 模式可見）

### app.js

**用途**: 所有應用程式邏輯

**主要區塊**:

#### 1. 狀態管理 (appState)
```javascript
const appState = {
    smartClient: null,      // SMART FHIR Client
    smartMode: false,       // 是否為 SMART 模式
    demoMode: false,        // 是否為 Demo 模式
    currentPatient: null,   // 當前病患資料
    bpReadings: [],         // 血壓記錄
    thresholds: {...},      // 血壓閾值
    thresholdLocked: false, // 閾值是否鎖定
    thresholdPassword: ''   // 鎖定密碼
};
```

#### 2. SMART on FHIR 初始化
```javascript
async function initSmartOnFhir() {
    const client = await FHIR.oauth2.ready();
    appState.smartClient = client;
    appState.smartMode = true;
    // 載入病患資料...
}
```

#### 3. 血壓分類邏輯
```javascript
function classifyBP(systolic, diastolic) {
    // 根據閾值返回: normal, elevated, high1, high2, crisis
}
```

#### 4. 病患資料函數

**SMART 模式**:
- `loadPatientData()` - 載入所有病患資料
- `renderPatientBasicInfo()` - 渲染基本資料
- `renderPatientConditions()` - 渲染診斷
- `renderPatientMedications()` - 渲染用藥
- `renderPatientReports()` - 渲染檢驗報告
- `renderPatientVitalSigns()` - 渲染生命徵象

**Demo 模式**:
- `loadDemoPatientData_Full()` - 載入模擬資料
- `renderDemoPatientBasicInfo()` - 渲染模擬基本資料
- `renderDemoPatientConditions()` - 渲染模擬診斷
- `renderDemoPatientMedications()` - 渲染模擬用藥
- `renderDemoPatientReports()` - 渲染模擬報告
- `renderDemoPatientVitalSigns()` - 渲染模擬生命徵象

#### 5. 閾值鎖定
```javascript
function lockThresholds()      // 設定密碼並鎖定
function unlockThresholds()    // 輸入密碼解鎖
function resetThresholdLock()  // 重設鎖定
```

---

## FHIR 資源與 LOINC 代碼

### 使用的 FHIR 資源

| 資源 | 用途 |
|------|------|
| Patient | 病患基本資料 |
| Observation | 血壓、生命徵象 |
| Condition | 診斷/疾病 |
| MedicationRequest | 用藥處方 |
| DiagnosticReport | 檢驗報告 |

### 血壓相關 LOINC 代碼

| 代碼 | 說明 |
|------|------|
| 85354-9 | Blood pressure panel |
| 8480-6 | Systolic blood pressure |
| 8462-4 | Diastolic blood pressure |

---

## 部署設定

### GitHub Pages

1. Repository: `https://github.com/zeroR10B21022/SMARTbpMonitor`
2. 部署 URL: `https://zeror10b21022.github.io/SMARTbpMonitor/`

### MOHW Sandbox 設定

1. 前往 `https://thas.mohw.gov.tw/`
2. 登入並選擇病患
3. 設定 App Launch URL: `https://zeror10b21022.github.io/SMARTbpMonitor/launch.html`
4. 點擊 Launch 啟動應用程式

---

## 本地開發

### 啟動本地伺服器

```bash
# 使用 Python
python -m http.server 8000

# 使用 Node.js
npx http-server

# 使用 VS Code Live Server 擴充功能
```

### 測試 Demo 模式

直接開啟 `index.html` 或訪問 `/index.html`，點擊「使用 Demo 模式」

### 測試 SMART 模式

需要從 EHR Sandbox 啟動，無法直接本地測試 OAuth 流程

---

## 常見問題

### Q: "No server url found" 錯誤

**原因**: 直接訪問 `launch.html` 而非從 EHR 啟動

**解決**: SMART OAuth 必須從 EHR 端發起，應用程式無法自行啟動 OAuth

### Q: 病患資料 Tab 不顯示

**原因**: 只有 SMART 模式或 Demo 模式才會顯示

**解決**: 確保透過 EHR 啟動或點擊「使用 Demo 模式」

### Q: 閾值被鎖定，忘記密碼

**解決**:
1. 開啟瀏覽器開發者工具 (F12)
2. Console 輸入: `localStorage.removeItem('thresholdPassword'); localStorage.removeItem('thresholdLocked'); location.reload();`

---

## 程式碼修改指南

### 新增 FHIR 資源讀取

1. 在 `loadPatientData()` 加入新的 API 請求
2. 建立對應的 `renderPatientXXX()` 函數
3. 在 `index.html` 加入顯示區塊
4. 同步更新 Demo 模式的 `renderDemoPatientXXX()` 函數

### 修改血壓分類閾值

修改 `appState.thresholds` 物件中的預設值：
```javascript
thresholds: {
    normal: { systolic: 120, diastolic: 80 },
    elevated: { systolic: 130, diastolic: 80 },
    high1: { systolic: 140, diastolic: 90 },
    high2: { systolic: 180, diastolic: 120 }
}
```

### 新增 UI Tab

1. 在 `index.html` 的 `<ul class="nav nav-tabs">` 加入新的 `<li>`
2. 在 `<div class="tab-content">` 加入對應的 `<div class="tab-pane">`
3. 在 `app.js` 加入相關邏輯

---

## 聯絡資訊

- GitHub: https://github.com/zeroR10B21022/SMARTbpMonitor
- 參考專案: https://github.com/zeroR10B21022/WFtmuFHIRtest
