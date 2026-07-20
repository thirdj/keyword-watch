'use client';

import { useEffect, useState } from 'react';
import KeywordModal, { KeywordFormValue } from '@/components/KeywordModal';

interface Keyword {
  id: number;
  keyword: string;
  search_engine: string;
  interval_min: number;
  last_checked_at: string | null;
  is_active: boolean;
  last_check_is_new: boolean | null;
}

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
    if (!confirm('이 키워드를 삭제할까요?')) return;
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
      searchEngine: kw.search_engine,
      intervalMin: kw.interval_min,
    });
    setModalMode('edit');
  }

  function closeModal() {
    setModalMode(null);
    setEditTarget(undefined);
  }

  // 수정 모드일 땐 본인 자신을 뺀 나머지 개수 기준으로 사용량을 계산해야 정확함
  const countExcludingEditTarget = modalMode === 'edit' && editTarget ? keywords.length - 1 : keywords.length;

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
          {keywords.map((kw, i) => (
            <KeywordRow
              key={kw.id}
              keyword={kw}
              isLast={i === keywords.length - 1}
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
          currentCount={countExcludingEditTarget}
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

  const progress = getCheckProgress(keyword, now);
  const [showArticles, setShowArticles] = useState(false);

  return (
    <div style={{ borderBottom: borderStyle, opacity: rowOpacity, transition: 'opacity 0.15s ease' }}>
      {/* 데스크톱: 한 줄 레이아웃 */}
      <div className="kw-row-desktop" style={{ alignItems: 'center', gap: 12, padding: '14px 16px' }}>
        <span className={`status-dot ${dotClass}`} aria-hidden="true" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>{keyword.keyword}</p>
          <p
            style={{
              fontSize: 12,
              color: isNew ? 'var(--success)' : 'var(--text-secondary)',
              margin: '2px 0 0',
            }}
          >
            {statusLabel}
          </p>
        </div>
        <button onClick={() => setShowArticles((v) => !v)} disabled={!hasChecked} style={{ fontSize: 12.5, padding: '6px 10px' }}>
          기사 보기 {showArticles ? '▲' : '▼'}
        </button>
        <span className="badge">{keyword.search_engine}</span>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)', minWidth: 52, textAlign: 'right' }}>
          {formatInterval(keyword.interval_min)}
        </span>
        <button onClick={onEdit} disabled={isDeleting} style={{ fontSize: 12.5, padding: '6px 10px' }}>
          수정
        </button>
        <button className="danger-ghost" onClick={onDelete} disabled={isDeleting}>
          {isDeleting ? '삭제 중...' : '삭제'}
        </button>
      </div>

      {/* 모바일: 2단 카드 레이아웃 — 제목/상태 위, 메타정보+버튼 아래 */}
      <div className="kw-row-mobile">
        <div className="kw-top">
          <span className={`status-dot ${dotClass}`} aria-hidden="true" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p className="kw-title">{keyword.keyword}</p>
            <p className={`kw-status ${isNew ? 'new' : ''}`}>{statusLabel}</p>
          </div>
        </div>
        <div className="kw-footer">
          <div className="kw-footer-meta">
            <span className="badge">{keyword.search_engine}</span>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              {formatInterval(keyword.interval_min)}
            </span>
          </div>
          <div className="kw-footer-actions">
            <button onClick={() => setShowArticles((v) => !v)} disabled={!hasChecked}>
              기사 {showArticles ? '▲' : '▼'}
            </button>
            <button onClick={onEdit} disabled={isDeleting}>
              수정
            </button>
            <button className="danger-ghost" onClick={onDelete} disabled={isDeleting}>
              {isDeleting ? '삭제 중...' : '삭제'}
            </button>
          </div>
        </div>
      </div>

      {/* 다음 체크까지 남은 시간 — 데스크톱/모바일 공통 */}
      <div className="kw-progress">
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progress.percent}%` }} />
        </div>
        <span className="kw-progress-label">{progress.label}</span>
      </div>

      {showArticles && <ArticleList keywordId={keyword.id} />}
    </div>
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
function getCheckProgress(keyword: Keyword, now: number): { percent: number; label: string } {
  if (!keyword.last_checked_at) {
    return { percent: 100, label: '곧 첫 확인 예정' };
  }

  const lastCheckedMs = new Date(keyword.last_checked_at).getTime();
  const intervalMs = keyword.interval_min * 60_000;
  const nextCheckMs = lastCheckedMs + intervalMs;
  const elapsedMs = now - lastCheckedMs;

  const percent = Math.min(100, Math.max(0, (elapsedMs / intervalMs) * 100));
  const remainingMs = nextCheckMs - now;

  const label = remainingMs <= 0 ? '곧 확인 예정' : `${formatRemaining(remainingMs)} 후 확인`;

  return { percent, label };
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
  if (diffMin < 60) return `${diffMin}분 전 확인`;
  return `${Math.round(diffMin / 60)}시간 전 확인`;
}
