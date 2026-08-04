"""Human Quest のアーキテクチャ図を生成する。

実行方法:
    brew install graphviz        # 既に入っていれば不要
    pip install diagrams
    python docs/architecture.py

出力: docs/images/architecture_overview.png / docs/images/post_flow.png
"""

from diagrams import Cluster, Diagram, Edge
from diagrams.gcp.compute import Run
from diagrams.gcp.ml import AIPlatform
from diagrams.gcp.security import KMS
from diagrams.gcp.storage import GCS
from diagrams.generic.storage import Storage
from diagrams.onprem.client import Users
from diagrams.onprem.database import PostgreSQL
from diagrams.onprem.vcs import Github
from diagrams.programming.framework import React
from diagrams.programming.language import Typescript

# 日本語ラベルが豆腐にならないようフォントを明示する（macOS 標準フォント）
FONT = "Hiragino Sans"
GRAPH_ATTR = {"fontname": FONT, "fontsize": "13", "pad": "0.4", "splines": "spline"}
NODE_ATTR = {"fontname": FONT, "fontsize": "11"}
EDGE_ATTR = {"fontname": FONT, "fontsize": "10"}


def overview() -> None:
    """本番構成（Firebase App Hosting + Neon + Firebase Storage + Gemini）。"""
    with Diagram(
        "Human Quest — システム構成",
        filename="docs/images/architecture_overview",
        show=False,
        direction="LR",
        graph_attr=GRAPH_ATTR,
        node_attr=NODE_ATTR,
        edge_attr=EDGE_ATTR,
    ):
        with Cluster("ブラウザ", graph_attr=GRAPH_ATTR):
            users = Users("ユーザー\n(PC / モバイル)")
            local_store = Storage("localStorage")
            users - Edge(style="dotted", **EDGE_ATTR) - local_store

        github = Github("GitHub\nmain ブランチ")

        with Cluster("Firebase App Hosting (Cloud Run)", graph_attr=GRAPH_ATTR):
            app = Run("Next.js 16 SSR")

            with Cluster("Next.js アプリ", graph_attr=GRAPH_ATTR):
                pages = React(
                    "Client Components"
                )
                api = Typescript(
                    "Route Handlers"
                )
                pages >> Edge(label="fetch", **EDGE_ATTR) >> api

        with Cluster("マネージドサービス", graph_attr=GRAPH_ATTR):
            neon = PostgreSQL("Neon PostgreSQL 16")
            gcs = GCS("Firebase Storage")
            gemini = AIPlatform("Gemini API")
            secrets = KMS("Secret Manager")

        users >> Edge(label="HTTPS", **EDGE_ATTR) >> app
        app >> Edge(style="dashed", **EDGE_ATTR) >> pages

        api >> Edge(label="lib/db.ts (pg Pool)", **EDGE_ATTR) >> neon
        api >> Edge(label="lib/storage.ts", **EDGE_ATTR) >> gcs
        api >> Edge(label="lib/ai.ts", **EDGE_ATTR) >> gemini

        secrets >> Edge(label="環境変数を注入", style="dotted", **EDGE_ATTR) >> app
        (
            github
            >> Edge(
                label="自動デプロイ",
                style="dotted",
                **EDGE_ATTR,
            )
            >> app
        )
        users << Edge(label="メディア配信", **EDGE_ATTR) << gcs


def post_flow() -> None:
    """投稿 1 件が処理される流れ（POST /api/posts）。"""
    with Diagram(
        "Human Quest — 投稿フロー (POST /api/posts)",
        filename="docs/images/post_flow",
        show=False,
        direction="LR",
        graph_attr=GRAPH_ATTR,
        node_attr=NODE_ATTR,
        edge_attr=EDGE_ATTR,
    ):
        user = Users("ユーザー")
        quest_page = React("/quest\n写真・動画 + コメント")
        api = Typescript("POST /api/posts")
        gcs = GCS("Firebase Storage")
        gemini = AIPlatform("Gemini\ngenerateFeedback()")

        with Cluster("PostgreSQL", graph_attr=GRAPH_ATTR):
            db_quest = PostgreSQL("今日の課題か確認する\ndaily_quests / quest_catalog")

            with Cluster("BEGIN 〜 COMMIT（失敗時は ROLLBACK）", graph_attr=GRAPH_ATTR):
                db_post = PostgreSQL(
                    "投稿・XP・バッジを記録する\nposts / xp_events / user_badges"
                )

            db_view = PostgreSQL("ランキングを集計する\nVIEW user_rankings")

        user >> Edge(label="① 行動して投稿", **EDGE_ATTR) >> quest_page
        quest_page >> Edge(label="② multipart/form-data", **EDGE_ATTR) >> api
        api >> Edge(label="③ 課題・重複投稿の検証", **EDGE_ATTR) >> db_quest
        db_quest >> Edge(label="投稿済みなら 409", style="dotted", **EDGE_ATTR) >> api
        api >> Edge(label="④ メディア保存 → 公開URL", **EDGE_ATTR) >> gcs
        api >> Edge(label="⑤ AIフィードバック生成", **EDGE_ATTR) >> gemini
        (
            api
            >> Edge(
                label="⑥ 投稿を保存してXP・バッジを付与\nXP = max(1000×0.6^n, 100)",
                **EDGE_ATTR,
            )
            >> db_post
        )
        db_post >> Edge(label="⑦ 集計", style="dashed", **EDGE_ATTR) >> db_view
        (
            api
            >> Edge(label="⑧ XP・バッジ・フィードバックを返却", **EDGE_ATTR)
            >> quest_page
        )


if __name__ == "__main__":
    overview()
    post_flow()
