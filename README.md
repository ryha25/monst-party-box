# MONST BOX — Phase 1

スマホ優先の個人用BOX登録アプリです。メイン/サブを完全に分け、スクリーンショットの確認結果を所持数として保存します。Phase 2以降でクエストDBと編成提案を追加します。

## 今回できること

- メイン・サブの独立BOX
- 複数スクリーンショットの選択と端末内プレビュー
- ローカル候補化、確認・数量修正・キャラ検索による手動追加
- 同じキャラを重複行にせず、所持数へ加算
- 登録済みBOXの検索

画像そのものを外部へ送信せず、APIキーも使用しません。現時点の候補化は、ローカルのキャラクターカタログと画像ファイル名の照合です。モンストのアイコンだけからキャラを高精度に特定する機能には、次段階でサーバー側の画像認識サービスまたは学習済みモデルと、十分なキャラ画像DBが必要です。誤登録を防ぐため、どの認識方式でも確認・手動修正画面は維持します。

## 起動

この環境では同梱の pnpm を使います。

```powershell
& 'C:\Users\ryuya\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd' start
```

ブラウザで `http://localhost:4173` を開きます。保存先は当面ブラウザの Local Storage で、初期試用ができます。

## 本番DB

`supabase/migrations/202609210001_phase1_box.sql` がPostgreSQL/Supabase向けのPhase 1スキーマです。`characters`（共通キャラDB）と`account_characters`（ユーザーの所持数）を分離しています。Supabaseプロジェクトへ migration を適用後、認証済みのサーバー側APIから接続してください。URLやキーはリポジトリに書かず、ホスティング環境の環境変数で渡します。

### アイコン照合サーバー

`202609220001_icon_catalog.sql` は照合用の基準アイコンと知覚ハッシュを管理し、原寸の画像は非公開の `character-icons` Storage bucket に置きます。`functions/recognize-icons` はブラウザが送ったアイコンの指紋に対し、上位3件の候補だけを返します。判定が弱い場合はアプリのアイコンごとの名前検索で確定します。

1. [Supabase](https://supabase.com/dashboard) で新しいプロジェクトを作成する。
2. プロジェクトの SQL Editor で `supabase/migrations/` の2ファイルを古い順に実行する。
3. Dashboard の Project URL と anon key を、GitHub Pagesのデプロイ設定へ環境変数として設定する。
4. service role key は Edge Function のシークレットだけに設定する。ブラウザやGitHubリポジトリには絶対に保存しない。

GitHub Pages用の `src/supabase-config.js` には Project URL と publishable key のみを置きます。このキーはブラウザ利用を前提とした公開キーです。ユーザーBOXは、Auth と RLS を有効にした接続後にのみ保存します。

### ログインの設定

Supabase Dashboard の **Authentication > URL Configuration** で Site URL と Redirect URLs に `https://ryha25.github.io/monst-party-box/` を追加します。**Authentication > Providers > Email** を有効にすると、アプリ内のメールアドレス・パスワードログインが利用できます。

キャラ名検索で候補が見つからない場合、名前をそのまま個人用キャラとして追加できます。これは端末内に保存され、公式カタログへは書き込みません。正式なキャラDB・アイコンを登録した後は、サーバー側のカタログが優先されます。

## テスト

```powershell
& 'C:\Users\ryuya\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd' test
```

確認対象: 重複取り込み、メイン/サブ分離、検索。

## 次の段階

1. Supabase認証・Storage・実DBリポジトリへ切替
2. 公式に利用許諾されたキャラ画像/データを登録し、画像認識器を接続
3. クエストDBと安定攻略・高速周回の別評価エンジン
