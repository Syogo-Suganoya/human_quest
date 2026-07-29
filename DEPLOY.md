# デプロイ手順書 — Neon + Firebase App Hosting（GUI操作）

Human Quest を本番環境へリリースするための手順をまとめる。Googleアカウントだけで完結する。
ローカル開発環境のセットアップは [CONTRIBUTING.md](CONTRIBUTING.md) を参照。

| 役割 | サービス | 費用 |
| :--- | :--- | :--- |
| アプリ本体 (Next.js SSR + API) | Firebase App Hosting | Blazeプラン必須（この規模なら実質無料枠内） |
| DB (PostgreSQL) | Neon 無料枠 | 無料（ストレージ0.5GB） |
| 投稿メディア（写真・動画） | Firebase Storage | 無料枠内（5GB） |
| AI | Gemini API（任意） | 未設定でもルールベースにフォールバック |

> **なぜこの構成か**: SSR＋APIルートがあるため静的ホスティング（Firebase Hostingのみ）では動かない。
> DBはローカルのDocker Postgresの代わりに、無料のマネージドPostgres（Neon）を使う。
> 投稿の写真・動画は Firebase App Hosting のファイルシステムが永続化されない（インスタンスが
> 複数・使い捨てになりうる）ため、ローカルディスクではなく Firebase Storage に保存するよう
> コード側も対応済み（`lib/storage.ts`。`FIREBASE_STORAGE_BUCKET` 未設定時はローカルディスクに
> フォールバックするので、ローカル開発では何も設定しなくてよい）。
> フルGoogleにするなら Cloud Run + Cloud SQL でも動くが、Cloud SQL は最小構成でも月額課金が
> 発生するため、ハッカソン用途では Neon 無料枠が現実的。

## 必要な環境変数

| 変数 | 必須 | 説明 |
| --- | --- | --- |
| `DATABASE_URL` | ✅ | Neon の接続文字列（Pooled connection） |
| `FIREBASE_STORAGE_BUCKET` | ✅（本番） | 投稿メディアの保存先バケット名。未設定時はローカルディスクにフォールバック |
| `GEMINI_API_KEY` | 任意 | 未設定の場合、AI課題選定・フィードバックは固定文言にフォールバック |
| `AI_MODEL` | 任意 | 既定：`gemini-2.5-flash` |

## 共通：事前チェック（ローカル）

```bash
cd human_quest
npm ci
npx tsc --noEmit   # 型チェック
npm run lint       # Lint
npm run build      # 本番ビルドが通ることを確認
```

---

## 手順1: Neon でDBを作る（約5分）

1. https://neon.tech を開き「Sign Up」→ Googleアカウントでサインアップ
2. 「Create project」でプロジェクト作成（Region: **Asia Pacific (Singapore)** など近い場所）
3. ダッシュボードの「Connection Details」で **Pooled connection** の接続文字列をコピー
   （ホスト名に `-pooler` が入っているもの）

## 手順2: スキーマとシードデータを投入（約3分）

1. Neon ダッシュボード左メニューの **SQL Editor** を開く
2. [`db/init/01_schema.sql`](db/init/01_schema.sql) の中身を貼り付けて **Run**
3. 続けて [`db/init/02_seed.sql`](db/init/02_seed.sql) の中身を貼り付けて **Run**
4. 左メニュー **Tables** で `quest_catalog`（15行）、`badges`（3行）ができていれば成功
   （`user_rankings` は **Views** に表示される）

## 手順3: ローカルで接続確認（約2分）

```bash
# .env.local は gitignore 済み
echo 'DATABASE_URL=postgresql://ユーザー名:パスワード@ep-xxxx-pooler.…/neondb?sslmode=require' > .env.local

rm -rf .next
npm run dev
```

http://localhost:3600 で `/login` → `/quest` の一連の流れが動けばDB接続OK。
確認できたらローカルのDocker DBは起動不要。

> 接続エラーが出る場合は、接続文字列の `&channel_binding=require` を削除して試す。

## 手順4: Firebase Storage でバケットを作る（約5分）

1. https://console.firebase.google.com を開き、Neonと同じ（または新規の）プロジェクトを開く
2. 左メニュー **構築 > Storage** → **使ってみる** → 既定の設定でバケットを作成
   （リージョンは Firebase App Hosting と同じにしておく）
3. 作成されたバケットの名前（例：`your-project-id.firebasestorage.app`）を控えておく
4. 「Rules」タブで、投稿画像を公開閲覧できるよう `allow read` を確認（既定の認証必須ルールのままだと
   フィード上で画像が表示されないため、`uploads/` 配下は `allow read: if true;` に緩める）

## 手順5: Firebase App Hosting でデプロイ（約15分）

1. コードをGitHubにpushしておく（App HostingはGitHub連携でデプロイ）
2. Firebase コンソールの左下の歯車 →「使用量と請求額」→ **Blazeプラン**にアップグレード
3. 左メニュー **構築 > App Hosting** → **使ってみる** → GitHubリポジトリを接続
   - ルートディレクトリ: `human_quest`（モノレポのため必須）
   - ライブブランチ: `main`
4. **Secret Manager にシークレットを作成**:
   - デプロイ設定画面の「環境変数とシークレット」または Google Cloud コンソールの Secret Manager で
     シークレット名: `DATABASE_URL` / 値: Neonの接続文字列 を登録
   - 同様に `GEMINI_API_KEY` を使う場合はシークレットとして登録
   - （[`apphosting.yaml`](apphosting.yaml) がこれらのシークレットと `FIREBASE_STORAGE_BUCKET` を
     参照する設定になっている。`FIREBASE_STORAGE_BUCKET` の値は手順4で控えたバケット名に書き換える）
5. デプロイ完了後、発行されたURL（`https://…run.app`）を開き、「デプロイ後の動作確認」（後述）を一通り確認する

## 2回目以降のリリース

`main` ブランチにpushすると自動でビルド・デプロイされる（Auto-Deploy既定ON）。

ロールバックしたい場合：

1. Firebase コンソールの App Hosting 画面で対象のロールアウト履歴を開く
2. 戻したいバージョンの「ロールバック」を選択

---

## デプロイ後の動作確認

1. `/` — ランディングページが表示される（未ログイン時）
2. `/login` — ニックネームでログインできる
3. `/quest` — 今日の課題が5件表示される。リロールできる
4. 投稿（写真アップロード）→ XP付与・AIフィードバックが返り、Firebase Storage上の画像がフィードに表示される
5. `/feed` `/ranking` `/profile/[id]` が表示される

## 注意事項・既知の制約

- **認証は擬似ログイン**（ニックネームのみ・パスワードなし）。デモ用途限定であり、一般公開する場合は本認証の実装が必須。
- **投稿メディアは `FIREBASE_STORAGE_BUCKET` 未設定だとローカルディスクに保存される**ため、Firebase App Hosting など複数インスタンス・使い捨てファイルシステムの環境では本番運用時に必ず設定すること。
- **README記載の不正対策（eKYC・AI画像検知など）は未実装**（MVPスコープ外）。
- **キャッシュバック等の「リアル」報酬は未実装**（README記載のポイント交換・キャッシュバックは今後の展開であり、現バージョンで付与されるのは経験値・レベル・バッジ等の「デジタル」報酬のみ）。
- DBのバックアップは Neon のブランチ機能や `pg_dump` の定期実行で対応すること。
- スキーマ変更時はマイグレーションツールを導入していないため、差分SQLを手動でNeonのSQL Editorに適用し、`db/init/01_schema.sql` を最新状態に保つこと。
