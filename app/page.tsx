'use client';

import { useEffect, useState } from 'react';
import KeywordModal, { KeywordFormValue } from '@/components/KeywordModal';
import KeywordActionSheet from '@/components/KeywordActionSheet';
import ConfirmDialog from '@/components/ConfirmDialog';

interface Keyword {
  id: number;
  keyword: string;
  search_engines: string[];
  interval_min: number;
  last_checked_at: string | null;
  is_active: boolean;
  last_check_is_new: boolean | null;
}

// DB엔 'google_rss' 같은 코드로 저장되지만, 화면엔 "Google RSS"처럼 사람이 읽기 좋은 이름으로 보여줌
const ENGINE_LABELS: Record<string, string> = {
  naver: 'Naver',
  google_rss: 'Google RSS',
};

export default function DashboardPage() {
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [now, setNow] = useState(() => Date.now());

  // 진행률 바가 시간이 지남에 따라 저절로 움직이도록 1분마다 현재 시각을 갱신
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editTarget, setEditTarget] = useState<KeywordFormValue | undefined>(undefined);

  async function fetchKeywords() {
    setLoading(true);
    setFetchError('');
    try {
      const res = await fetch('/api/keywords');
      const data = await res.json();
      if (!res.ok) {
        setFetchError(data.error ?? '키워드를 불러오지 못했어요.');
        setKeywords([]);
      } else {
        setKeywords(data);
      }
    } catch (err) {
      setFetchError('서버에 연결할 수 없어요. 잠시 후 다시 시도해주세요.');
      setKeywords([]);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchKeywords();
  }, []);

  async function handleDelete(id: number) {
    setDeleteError('');
    setDeletingId(id);
    try {
      const res = await fetch(`/api/keywords/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setDeleteError(data.error ?? '삭제에 실패했어요. 잠시 후 다시 시도해주세요.');
        return;
      }
      await fetchKeywords();
    } catch {
      setDeleteError('서버에 연결할 수 없어요. 잠시 후 다시 시도해주세요.');
    } finally {
      setDeletingId(null);
    }
  }

  function openCreateModal() {
    setEditTarget(undefined);
    setModalMode('create');
  }

  function openEditModal(kw: Keyword) {
    setEditTarget({
      id: kw.id,
      keyword: kw.keyword,
      searchEngines: kw.search_engines,
      intervalMin: kw.interval_min,
    });
    setModalMode('edit');
  }

  function closeModal() {
    setModalMode(null);
    setEditTarget(undefined);
  }

  // 새 기사가 있는 키워드를 맨 위로 올리고, 그 안에서는 원래 순서를 유지 (안정 정렬)
  const sortedKeywords = [...keywords].sort((a, b) => {
    const aNew = a.last_check_is_new === true ? 1 : 0;
    const bNew = b.last_check_is_new === true ? 1 : 0;
    return bNew - aNew;
  });

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '2.5rem 1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: 19, fontWeight: 600, margin: 0 }}>내 키워드</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '3px 0 0' }}>
            {keywords.length}개 등록됨
          </p>
        </div>
        <button className="primary" onClick={openCreateModal}>
          키워드 추가
        </button>
      </div>

      {deleteError && (
        <p style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 10 }}>{deleteError}</p>
      )}

      {loading ? (
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>불러오는 중...</p>
      ) : fetchError ? (
        <p style={{ color: 'var(--danger)', fontSize: 14 }}>{fetchError}</p>
      ) : keywords.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>등록된 키워드가 없어요. 추가해보세요.</p>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          {sortedKeywords.map((kw, i) => (
            <KeywordRow
              key={kw.id}
              keyword={kw}
              isLast={i === sortedKeywords.length - 1}
              isDeleting={deletingId === kw.id}
              now={now}
              onEdit={() => openEditModal(kw)}
              onDelete={() => handleDelete(kw.id)}
            />
          ))}
        </div>
      )}

      {modalMode && (
        <KeywordModal
          mode={modalMode}
          initialValue={editTarget}
          onClose={closeModal}
          onSaved={() => {
            closeModal();
            fetchKeywords();
          }}
        />
      )}
    </main>
  );
}

function KeywordRow({
  keyword,
  isLast,
  isDeleting,
  now,
  onEdit,
  onDelete,
}: {
  keyword: Keyword;
  isLast: boolean;
  isDeleting: boolean;
  now: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const hasChecked = keyword.last_checked_at !== null;
  const isNew = keyword.last_check_is_new === true;

  const statusLabel = !hasChecked
    ? '아직 확인 전'
    : isNew
      ? `새 결과 발견 · ${formatRelativeTime(keyword.last_checked_at!)}`
      : `변화 없음 · ${formatRelativeTime(keyword.last_checked_at!)}`;

  const dotClass = !hasChecked ? 'idle' : isNew ? 'new' : 'idle';
  const borderStyle = isLast ? 'none' : '1px solid var(--border)';
  const rowOpacity = isDeleting ? 0.5 : 1;

  const nextCheckLabel = getNextCheckLabel(keyword, now);
  const [showArticles, setShowArticles] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  return (
    <div style={{ borderBottom: borderStyle, opacity: rowOpacity, transition: 'opacity 0.15s ease' }}>
      {/* 제목/상태 + "..." 메뉴 → 검색엔진(텍스트) → 기사토글+주기(왼쪽)/다음 확인까지 남은 시간(오른쪽).
          뷰포트 상관없이 항상 같은 구조라 어떤 행이든 정렬이 안 흔들림 */}
      <div className="kw-row">
        <div className="kw-top">
          <span className={`status-dot ${dotClass}`} aria-hidden="true" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p className="kw-title">{keyword.keyword}</p>
            <p className={`kw-status ${isNew ? 'new' : ''}`}>{statusLabel}</p>
          </div>
          <button
            type="button"
            className="kw-menu-btn"
            aria-label="키워드 메뉴 열기"
            onClick={() => setMenuOpen(true)}
          >
            <DotsIcon />
          </button>
        </div>

        {keyword.search_engines.length > 0 && (
          <p className="kw-engines">
            {keyword.search_engines.map((e) => ENGINE_LABELS[e] ?? e).join(' · ')}
          </p>
        )}

        <div className="kw-meta-row">
          <div className="kw-meta-left">
            <button
              type="button"
              className="kw-view-btn"
              disabled={!hasChecked}
              onClick={() => setShowArticles((v) => !v)}
            >
              <ArticleIcon /> 기사 <ChevronIcon up={showArticles} />
            </button>
            <span className="kw-interval">
              <ClockIcon /> {formatInterval(keyword.interval_min)}
            </span>
          </div>
          <span className="kw-next-check">{nextCheckLabel}</span>
        </div>
      </div>

      {showArticles && <ArticleList keywordId={keyword.id} />}

      {menuOpen && (
        <KeywordActionSheet
          onEdit={() => {
            setMenuOpen(false);
            onEdit();
          }}
          onDelete={() => {
            setMenuOpen(false);
            setConfirmDeleteOpen(true);
          }}
          onClose={() => setMenuOpen(false)}
        />
      )}

      {confirmDeleteOpen && (
        <ConfirmDialog
          title="키워드 삭제"
          message={`"${keyword.keyword}" 키워드를 삭제할까요? 확인 이력도 함께 사라져요.`}
          confirmLabel="삭제"
          confirming={isDeleting}
          onCancel={() => setConfirmDeleteOpen(false)}
          onConfirm={() => {
            onDelete();
            setConfirmDeleteOpen(false);
          }}
        />
      )}
    </div>
  );
}

function DotsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="5" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="19" cy="12" r="1.8" />
    </svg>
  );
}

function ArticleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6M9 17h6" />
    </svg>
  );
}

function ChevronIcon({ up }: { up: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ transform: up ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  );
}

interface Article {
  title: string;
  url: string;
  snippet: string;
  publishedAt?: string;
}

// 키워드 행을 펼쳤을 때, 가장 최근 체크에서 찾은 기사만 보여준다.
// 매번 검색할 때마다 이 목록은 통째로 최신 결과로 교체되고(과거 이력 누적 없음),
// 그 시점에 찾은 게 없으면 "없음"으로 표시한다.
function ArticleList({ keywordId }: { keywordId: number }) {
  const [articles, setArticles] = useState<Article[] | null>(null);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/keywords/${keywordId}/articles`);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error ?? '기사를 불러오지 못했어요.');
        } else {
          setArticles(data.articles);
          setCheckedAt(data.checkedAt);
        }
      } catch {
        if (!cancelled) setError('서버에 연결할 수 없어요.');
      }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [keywordId]);

  return (
    <div className="article-list">
      {loading ? (
        <p className="article-empty">불러오는 중...</p>
      ) : error ? (
        <p className="article-empty" style={{ color: 'var(--danger)' }}>{error}</p>
      ) : !articles || articles.length === 0 ? (
        <p className="article-empty">
          {checkedAt ? `이 확인 시점(${formatRelativeTime(checkedAt)})엔 해당하는 기사가 없었어요.` : '아직 확인된 기사가 없어요.'}
        </p>
      ) : (
        articles.map((a, i) => (
          <a key={i} href={a.url} target="_blank" rel="noopener noreferrer" className="article-row">
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="article-title">{a.title}</p>
              <p className="article-meta">
                {new URL(a.url).hostname.replace(/^www\./, '')}
                {a.publishedAt ? ` · ${formatRelativeTime(a.publishedAt)}` : ''}
              </p>
            </div>
            <i className="article-link-icon" aria-hidden="true">↗</i>
          </a>
        ))
      )}
    </div>
  );
}

// 마지막 체크 시각 + 주기를 기준으로, 다음 체크까지 얼마나 남았는지 계산
// (GitHub Actions가 30분마다 순찰하는 구조라, 실제 체크는 여기서 계산된 시점보다
//  최대 30분 정도 늦게 이뤄질 수 있음)
function getNextCheckLabel(keyword: Keyword, now: number): string {
  if (!keyword.last_checked_at) {
    return '곧 첫 확인 예정';
  }

  const lastCheckedMs = new Date(keyword.last_checked_at).getTime();
  const intervalMs = keyword.interval_min * 60_000;
  const nextCheckMs = lastCheckedMs + intervalMs;
  const remainingMs = nextCheckMs - now;

  return remainingMs <= 0 ? '곧 확인 예정' : `${formatRemaining(remainingMs)} 후 확인`;
}

function formatRemaining(ms: number): string {
  const totalMin = Math.ceil(ms / 60_000);
  if (totalMin < 60) return `${totalMin}분`;
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  return mins > 0 ? `${hours}시간 ${mins}분` : `${hours}시간`;
}

function formatInterval(min: number): string {
  if (min < 1440) return `${min / 60}시간마다`;
  return `${min / 1440}일마다`;
}

function formatRelativeTime(iso: string): string {
  const diffMin = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 48) return `${diffHour}시간 전`;
  return `${Math.round(diffHour / 24)}일 전`;
}