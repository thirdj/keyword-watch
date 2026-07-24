-- 1단계: 데이터 모델

CREATE TABLE keywords (
  id            SERIAL PRIMARY KEY,
  user_id       TEXT NOT NULL,
  keyword       TEXT NOT NULL,
  search_engines TEXT[] NOT NULL DEFAULT ARRAY['google_rss'], -- 'google_rss' | 'naver' 중 1~2개
  interval_min  INTEGER NOT NULL DEFAULT 480,   -- 확인 주기(분 단위), 최소 60
  is_active     BOOLEAN NOT NULL DEFAULT true,
  last_checked_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT search_engines_count CHECK (array_length(search_engines, 1) BETWEEN 1 AND 2)
);

CREATE TABLE check_logs (
  id           SERIAL PRIMARY KEY,
  keyword_id   INTEGER NOT NULL REFERENCES keywords(id) ON DELETE CASCADE,
  checked_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  result_hash  TEXT NOT NULL,
  top_urls     JSONB,
  is_new       BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE seen_urls (
  id            SERIAL PRIMARY KEY,
  keyword_id    INTEGER NOT NULL REFERENCES keywords(id) ON DELETE CASCADE,
  url           TEXT NOT NULL,
  title         TEXT,
  content_hash  TEXT,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (keyword_id, url)
);

CREATE TABLE notifications (
  id            SERIAL PRIMARY KEY,
  keyword_id    INTEGER NOT NULL REFERENCES keywords(id) ON DELETE CASCADE,
  check_log_id  INTEGER NOT NULL REFERENCES check_logs(id) ON DELETE CASCADE,
  channel       TEXT NOT NULL, -- 'email'
  status        TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'sent' | 'failed'
  sent_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE notification_channels (
  id        SERIAL PRIMARY KEY,
  user_id   TEXT NOT NULL,
  channel   TEXT NOT NULL, -- 'email'
  target    TEXT NOT NULL, -- chat_id 또는 이메일 주소
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- 나무위키/블로그/위키백과처럼 뉴스 기사로 보기 어렵고, 페이지 안에 어떤 단어든
-- 우연히 섞여 있을 확률이 높아 오탐이 잦은 도메인. 검색 결과에서 매칭 이전 단계에
-- 아예 제외하는 용도로 쓴다 (lib/excludedDomains.ts, lib/checkKeyword.ts 참고)
CREATE TABLE volatile_domains (
  domain TEXT PRIMARY KEY
);
INSERT INTO volatile_domains (domain) VALUES
  ('namu.wiki'), ('blog.naver.com'), ('en.wikipedia.org'), ('ko.wikipedia.org');

CREATE INDEX idx_keywords_active ON keywords (is_active, last_checked_at);
CREATE INDEX idx_check_logs_keyword ON check_logs (keyword_id, checked_at DESC);
CREATE INDEX idx_seen_urls_lookup ON seen_urls (keyword_id, url);