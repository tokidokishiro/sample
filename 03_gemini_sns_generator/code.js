/**
 * スプレッドシートのキーワードからGemini API（gemini-1.5-flash）を呼び出し、
 * SNS投稿文を自動生成して書き込むスクリプト。
 */
function generateSNSPosts() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const lastRow = sheet.getLastRow();
  
  // 1. セキュリティ設定からGeminiのAPIキーを取得
  const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  
  if (!apiKey) {
    Browser.msgBox("エラー: GeminiのAPIキーが登録されていません。\n[設定マニュアル]に従ってAPIキーを登録してください。");
    return;
  }
  
  // シートが空の場合、ヘッダー（見出し）を作成
  if (lastRow === 0) {
    sheet.appendRow(["キーワード・テーマ", "投稿するSNS種類", "AI生成されたSNS文章"]);
    sheet.getRange(1, 1, 1, 3).setFontWeight("bold");
    return;
  }

  // 2. 2行目から順にキーワードを読み込んで処理
  for (let i = 2; i <= lastRow; i++) {
    const keyword = sheet.getRange(i, 1).getValue();   // A列: キーワード
    const platform = sheet.getRange(i, 2).getValue();  // B列: 投稿先のSNS
    const currentPost = sheet.getRange(i, 3).getValue(); // C列: 現在のセルの中身
    
    // キーワードが入力されており、かつ、まだ文章が生成されていない行を処理
    if (keyword && !currentPost) {
      sheet.getRange(i, 3).setValue("🔄 生成中...");
      SpreadsheetApp.flush(); // スプレッドシートの画面表示を「生成中」に即時更新
      
      try {
        // GeminiのAPIを呼び出して文章を生成
        const generatedText = callGemini(apiKey, keyword, platform);
        sheet.getRange(i, 3).setValue(generatedText);
      } catch (e) {
        sheet.getRange(i, 3).setValue("⚠️ エラー: " + e.message);
      }
    }
  }
}

/**
 * Gemini API (generateContent) を呼び出す関数
 */
function callGemini(apiKey, keyword, platform) {
  // 最新の軽量・高速モデル「gemini-1.5-flash」を使用
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  
  // システムへの役割指示（システムインストラクション）
  const systemInstruction = 
    "あなたは企業のSNSマーケティング担当者です。ユーザーから与えられた「キーワード」と「投稿するSNSの種類」に合わせて、" +
    "ユーザーの興味を惹きつける、エンゲージメントの高い魅力的な投稿文を作成してください。\n" +
    "適切な絵文字や、末尾に関連するハッシュタグ（5個程度）も含めて出力してください。";
  
  // ユーザープロンプト
  const prompt = `【キーワード/テーマ】: ${keyword}\n【投稿先のSNS】: ${platform}\n\nこの条件で投稿用の文章を作成してください。`;

  // リクエストデータ（Gemini APIの仕様）
  const payload = {
    "contents": [
      {
        "parts": [
          {
            "text": prompt
          }
        ]
      }
    ],
    "systemInstruction": {
      "parts": [
        {
          "text": systemInstruction
        }
      ]
    },
    "generationConfig": {
      "temperature": 0.7
    }
  };
  
  const options = {
    "method": "post",
    "contentType": "application/json",
    "payload": JSON.stringify(payload),
    "muteHttpExceptions": true
  };
  
  // APIリクエストの実行
  const response = UrlFetchApp.fetch(url, options);
  const responseCode = response.getResponseCode();
  const responseText = response.getContentText();
  const json = JSON.parse(responseText);
  
  if (responseCode !== 200) {
    throw new Error(json.error ? json.error.message : "通信エラーが発生しました。");
  }
  
  // 生成されたテキストの抽出
  try {
    return json.candidates[0].content.parts[0].text.trim();
  } catch (e) {
    throw new Error("APIからの応答データの解析に失敗しました。");
  }
}
