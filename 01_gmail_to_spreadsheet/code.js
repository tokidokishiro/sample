/**
 * Gmailの特定のメールを検索し、スプレッドシートに自動転記するスクリプト
 * 転記したメールには「スプレッドシート転記済」というラベルを付与し、重複取り込みを防ぎます。
 */
function importGmailToSpreadsheet() {
  // 1. スプレッドシートの準備
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
  // シートが空の場合、ヘッダー（見出し）を作成
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["受信日時", "送信元アドレス", "件名", "本文（抜粋）", "メールリンク"]);
    // ヘッダーのデザインを少し整える（太字にする）
    sheet.getRange(1, 1, 1, 5).setFontWeight("bold");
  }

  // 2. 検索条件の設定
  // 例：「件名に【問い合わせ】が含まれ、かつ、まだ『スプレッドシート転記済』ラベルが付いていない未読メール」
  const searchQuery = 'subject:"【問い合わせ】" -label:スプレッドシート転記済';
  
  // 3. Gmailから条件に合うメール（スレッド）を取得（最大30件）
  const threads = GmailApp.search(searchQuery, 0, 30);
  if (threads.length === 0) {
    Logger.log("新しい対象メールはありませんでした。");
    return;
  }

  // 4. 重複処理防止用のラベルの準備
  let label = GmailApp.getUserLabelByName("スプレッドシート転記済");
  if (!label) {
    // ラベルが存在しない場合は自動で新規作成
    label = GmailApp.createLabel("スプレッドシート転記済");
  }

  // 5. 各メールの情報を解析してシートに書き出し
  // 古いメールから順番に処理するため、配列を逆順にする
  threads.reverse();

  for (let i = 0; i < threads.length; i++) {
    const thread = threads[i];
    const messages = thread.getMessages();
    
    // スレッド内の最後のメールを取得
    const lastMessage = messages[messages.length - 1];
    
    const date = lastMessage.getDate();        // 受信日時
    const from = lastMessage.getFrom();        // 送信元
    const subject = lastMessage.getSubject();  // 件名
    
    // 本文は改行を整理し、先頭の500文字を抜粋
    let plainBody = lastMessage.getPlainBody();
    let bodySnippet = plainBody.replace(/\r?\n/g, " ").substring(0, 500); 
    
    // メールのURL（スプレッドシートから直接メールを開けるようにする）
    const mailUrl = "https://mail.google.com/mail/u/0/#inbox/" + thread.getId();

    // スプレッドシートの最終行にデータを追加
    sheet.appendRow([date, from, subject, bodySnippet, mailUrl]);
    
    // 処理済みラベルを貼る（次回の重複取り込みを防ぐため）
    thread.addLabel(label);
    
    // 必要に応じて、メールを既読にする場合は以下のコメントアウトを解除
    // thread.markRead();
  }
  
  Logger.log(threads.length + " 件 of mails imported.");
}
