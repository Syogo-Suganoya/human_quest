-- Human Quest MVP スキーマ

CREATE TABLE users (
  id          serial PRIMARY KEY,
  nickname    text NOT NULL UNIQUE,
  bio         text NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 静的な課題カタログ（カテゴリ別）
CREATE TABLE quest_catalog (
  id             serial PRIMARY KEY,
  category       text NOT NULL, -- health / community / relationship / learning / challenge
  title          text NOT NULL,
  description    text NOT NULL,
  required_media text NOT NULL DEFAULT 'any' CHECK (required_media IN ('any', 'photo')) -- any: 画像/動画どちらも可 / photo: 画像必須
);

-- ユーザーごとの当日課題（1日に複数件割り当てる）
CREATE TABLE daily_quests (
  id                serial PRIMARY KEY,
  user_id           integer NOT NULL REFERENCES users(id),
  quest_catalog_id  integer NOT NULL REFERENCES quest_catalog(id),
  assigned_date     date NOT NULL DEFAULT CURRENT_DATE,
  status            text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'rerolled')),
  UNIQUE (user_id, assigned_date, quest_catalog_id)
);

CREATE INDEX daily_quests_user_date_idx ON daily_quests (user_id, assigned_date);

CREATE TABLE posts (
  id              serial PRIMARY KEY,
  user_id         integer NOT NULL REFERENCES users(id),
  daily_quest_id  integer NOT NULL REFERENCES daily_quests(id),
  media_url       text NOT NULL DEFAULT '', -- none のときは空文字
  media_type      text NOT NULL, -- image / video / none（コメントのみの投稿）
  comment         text NOT NULL DEFAULT '',
  ai_feedback     text NOT NULL DEFAULT '',
  xp_awarded      integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX posts_user_idx ON posts (user_id);
CREATE INDEX posts_created_idx ON posts (created_at DESC);

CREATE TABLE post_reactions (
  id          serial PRIMARY KEY,
  post_id     integer NOT NULL REFERENCES posts(id),
  user_id     integer NOT NULL REFERENCES users(id),
  kind        text NOT NULL DEFAULT 'cheer', -- cheer(応援) / empathy(共感)
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id, kind)
);

CREATE TABLE post_comments (
  id          serial PRIMARY KEY,
  post_id     integer NOT NULL REFERENCES posts(id),
  user_id     integer NOT NULL REFERENCES users(id),
  body        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- XP付与ログ。同一課題の実施回数から逓減幅を算出する元データ
CREATE TABLE xp_events (
  id                serial PRIMARY KEY,
  user_id           integer NOT NULL REFERENCES users(id),
  quest_catalog_id  integer NOT NULL REFERENCES quest_catalog(id),
  post_id           integer NOT NULL REFERENCES posts(id),
  points            integer NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE badges (
  id           serial PRIMARY KEY,
  code         text NOT NULL UNIQUE,
  title        text NOT NULL,
  description  text NOT NULL
);

CREATE TABLE user_badges (
  id          serial PRIMARY KEY,
  user_id     integer NOT NULL REFERENCES users(id),
  badge_id    integer NOT NULL REFERENCES badges(id),
  earned_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, badge_id)
);

-- ランキング用ビュー: 累計XP・レベル・投稿数・継続日数(ユニーク投稿日数)
CREATE VIEW user_rankings AS
SELECT
  u.id,
  u.nickname,
  COALESCE(SUM(x.points), 0) AS total_xp,
  (COALESCE(SUM(x.points), 0) / 1000) + 1 AS level,
  COUNT(DISTINCT p.id) AS post_count,
  COUNT(DISTINCT p.created_at::date) AS active_days,
  COUNT(DISTINCT p.daily_quest_id) AS quest_count
FROM users u
LEFT JOIN posts p ON p.user_id = u.id
LEFT JOIN xp_events x ON x.user_id = u.id
GROUP BY u.id, u.nickname;
