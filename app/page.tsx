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

const MAX_KEYWORDS = 10;

export default function DashboardPage() {
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editTarget, setEditTarget] = useState<KeywordFormValue | undefined>(undefined);

  async function fetchKeywords() {
    setLoading(true);
    const res = await fetch('/api/keywords');
    const data = await res.json();
    setKeywords(data);
    setLoading(false);
  }

  useEffect(() => {
    fetchKeywords();
  }, []);

  async function handleDelete(id: number) {
    if (!confirm('이 키워드를 삭제할까요?')) return;
    await fetch(`/api/keywords/${id}`, { method: 'DELETE' });
    fetchKeywords();
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
            {keywords.length}/{MAX_KEYWORDS}개 등록됨
          </p>
        </div>
        <button className="primary" onClick={openCreateModal} disabled={keywords.length >= MAX_KEYWORDS}>
          키워드 추가
        </button>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>불러오는 중...</p>
      ) : keywords.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>등록된 키워드가 없어요. 추가해보세요.</p>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          {keywords.map((kw, i) => (
            <KeywordRow
              key={kw.id}
              keyword={kw}
              isLast={i === keywords.length - 1}
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
  onEdit,
  onDelete,
}: {
  keyword: Keyword;
  isLast: boolean;
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

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '14px 16px',
        borderBottom: isLast ? 'none' : '1px solid var(--border)',
      }}
    >
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
      <span className="badge">{keyword.search_engine}</span>
      <span style={{ fontSize: 12, color: 'var(--text-secondary)', minWidth: 52, textAlign: 'right' }}>
        {formatInterval(keyword.interval_min)}
      </span>
      <button onClick={onEdit} style={{ fontSize: 12.5, padding: '6px 10px' }}>
        수정
      </button>
      <button className="danger-ghost" onClick={onDelete}>
        삭제
      </button>
    </div>
  );
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
