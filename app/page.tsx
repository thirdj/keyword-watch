'use client';

import { useEffect, useState } from 'react';
import AddKeywordModal from '@/components/AddKeywordModal';

interface Keyword {
  id: number;
  keyword: string;
  search_engine: string;
  interval_min: number;
  last_checked_at: string | null;
  is_active: boolean;
}

const MAX_KEYWORDS = 10;

export default function DashboardPage() {
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

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

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '2rem 1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 500, margin: 0 }}>내 키워드</h1>
          <p style={{ fontSize: 13, color: '#888', margin: '2px 0 0' }}>
            {keywords.length}/{MAX_KEYWORDS}개 등록됨
          </p>
        </div>
        <button onClick={() => setShowAddModal(true)} disabled={keywords.length >= MAX_KEYWORDS}>
          키워드 추가
        </button>
      </div>

      {loading ? (
        <p style={{ color: '#888', fontSize: 14 }}>불러오는 중...</p>
      ) : keywords.length === 0 ? (
        <p style={{ color: '#888', fontSize: 14 }}>등록된 키워드가 없어요. 추가해보세요.</p>
      ) : (
        <div style={{ border: '1px solid #eee', borderRadius: 8, overflow: 'hidden' }}>
          {keywords.map((kw) => (
            <KeywordRow key={kw.id} keyword={kw} onDelete={() => handleDelete(kw.id)} />
          ))}
        </div>
      )}

      {showAddModal && (
        <AddKeywordModal
          currentCount={keywords.length}
          onClose={() => setShowAddModal(false)}
          onSaved={() => {
            setShowAddModal(false);
            fetchKeywords();
          }}
        />
      )}
    </main>
  );
}

function KeywordRow({ keyword, onDelete }: { keyword: Keyword; onDelete: () => void }) {
  const lastChecked = keyword.last_checked_at
    ? formatRelativeTime(keyword.last_checked_at)
    : '아직 확인 전';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '14px 16px',
        borderBottom: '1px solid #eee',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>{keyword.keyword}</p>
        <p style={{ fontSize: 12, color: '#888', margin: '2px 0 0' }}>{lastChecked}</p>
      </div>
      <span style={{ fontSize: 12, color: '#888', background: '#f5f5f5', padding: '3px 8px', borderRadius: 6 }}>
        {keyword.search_engine}
      </span>
      <span style={{ fontSize: 12, color: '#888', minWidth: 52, textAlign: 'right' }}>
        {formatInterval(keyword.interval_min)}
      </span>
      <button onClick={onDelete} style={{ fontSize: 12, color: '#c00' }}>
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
