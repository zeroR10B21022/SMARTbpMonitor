# 智慧手錶資料匯入指南

## 支援的資料格式

本系統支援匯入 JSON 格式的智慧手錶資料，包含以下類型：

### 血壓資料 (bp) - **必需**
- `time`: 測量時間（格式: "YYYY-MM-DD HH:MM:SS"）
- `sys`: 收縮壓（mmHg）
- `dia`: 舒張壓（mmHg）

### 心率資料 (hb) - 選用
- `time`: 測量時間
- `heartrate`: 心率（bpm）

### 血氧資料 (spo2) - 選用
- `time`: 測量時間
- `spo2`: 血氧濃度（%）

## JSON 檔案範例

```json
{
  "bp": [
    {
      "time": "2024-10-16 10:15:00",
      "sys": 130,
      "dia": 92
    },
    {
      "time": "2024-10-16 10:30:00",
      "sys": 132,
      "dia": 92
    }
  ],
  "hb": [
    {
      "time": "2024-10-16 10:04:00",
      "heartrate": 95
    }
  ],
  "spo2": [
    {
      "time": "2024-10-16 10:11:00",
      "spo2": 86
    }
  ]
}
```

## 匯入步驟

1. **準備 JSON 檔案**
   - 確保檔案格式正確
   - 確保至少包含 `bp` 陣列
   - 檔案副檔名為 `.json`

2. **開啟應用程式**
   - 雙擊 `index.html` 或
   - 執行 `啟動應用.bat`

3. **連接到系統**
   - 選擇「連接到 Taiwan HAPI FHIR 伺服器」或
   - 選擇「使用 Demo 模式」

4. **切換到輸入血壓頁籤**
   - 點擊上方的「輸入血壓」標籤

5. **上傳 JSON 檔案**
   - 滾動到「匯入智慧手錶資料」區塊
   - 點擊「選擇 JSON 檔案」按鈕
   - 選擇您的 JSON 檔案
   - 點擊「匯入資料」按鈕

6. **查看結果**
   - 系統會顯示匯入統計
   - 重複的記錄會自動跳過
   - 無效的記錄會被忽略
   - 成功後會自動切換到儀表板

## 資料處理說明

### 重複處理
- 系統會根據測量時間判斷重複記錄
- 重複的記錄不會被匯入
- 匯入結果會顯示跳過的重複記錄數量

### 資料驗證
- 收縮壓範圍: 60-250 mmHg
- 舒張壓範圍: 40-150 mmHg
- 時間格式必須正確
- 無效記錄會被跳過並計入統計

### 資料來源標記
- 從智慧手錶匯入的資料會標記為 `smartwatch`
- 手動輸入的資料標記為 `local` 或 `fhir`
- 可在歷史紀錄中區分不同來源

## 常見問題

### Q: 支援哪些智慧手錶？
A: 只要能匯出符合上述 JSON 格式的智慧手錶都支援。常見品牌包括：
- Apple Watch
- Fitbit
- Garmin
- Samsung Galaxy Watch
- 小米手環
- Huawei Watch

### Q: 如何從智慧手錶匯出資料？
A: 每個品牌的匯出方式不同，一般步驟：
1. 開啟手錶配套 App
2. 找到「健康資料」或「資料匯出」功能
3. 選擇「血壓」資料類型
4. 選擇匯出格式為 JSON 或 CSV
5. 如果只有 CSV，需要轉換為 JSON 格式

### Q: 匯入後資料存在哪裡？
A:
- **FHIR 模式**: 資料會儲存到 Taiwan HAPI FHIR 伺服器
- **Demo 模式**: 資料僅存在瀏覽器的 localStorage

### Q: 可以匯入多個檔案嗎？
A: 可以！系統會自動合併資料並去除重複記錄。

### Q: 匯入失敗怎麼辦？
A: 檢查以下項目：
1. JSON 格式是否正確（可用線上工具驗證）
2. 是否包含 `bp` 欄位
3. 時間格式是否正確
4. 數值範圍是否合理
5. 檔案編碼是否為 UTF-8

### Q: 可以編輯已匯入的資料嗎？
A: 目前版本不支援編輯，只能刪除瀏覽器資料後重新匯入。

## CSV 轉 JSON 工具

如果您的智慧手錶只能匯出 CSV 格式，可以使用以下 Python 腳本轉換：

```python
import csv
import json

# 讀取 CSV
with open('smartwatch_data.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    bp_data = []

    for row in reader:
        bp_data.append({
            'time': row['timestamp'],  # 根據您的 CSV 欄位名稱調整
            'sys': int(row['systolic']),
            'dia': int(row['diastolic'])
        })

# 寫入 JSON
output = {'bp': bp_data, 'hb': [], 'spo2': []}
with open('records.json', 'w', encoding='utf-8') as f:
    json.dump(output, f, indent=2, ensure_ascii=False)

print(f"轉換完成！共 {len(bp_data)} 筆記錄")
```

## 技術支援

如有任何問題，請聯繫：
- Email: 114346@w.tmu.edu.tw
- 或在 GitHub Issues 提出

---

**最後更新**: 2025-01-28
