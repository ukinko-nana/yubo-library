# ゆぼ文庫 Web Reader

サーバー不要の静的Web版です。

## 構成

- フロント: HTML / CSS / JavaScript
- データ: `data/novels.json`
- 配信: GitHub + Netlify

## ローカル確認

`start-local.bat` をダブルクリックします。

黒い画面が開いたままになったら、ブラウザで `http://localhost:8080` を開きます。
閉じるとサイトも止まります。

## 作品追加

`data/novels.json` の `chapters` に話を追加します。

```json
{
  "id": "episode-3",
  "title": "第三話",
  "body": "本文をここに入れます。"
}
```

## Netlify

Netlifyではこの `web-reader` フォルダを公開対象にします。

- Base directory: `web-reader`
- Publish directory: `.`
- Build command: 空欄でOK
