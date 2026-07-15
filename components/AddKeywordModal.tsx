'use client';

import { useState, type CSSProperties } from 'react';
import { estimateMonthlyUsage } from '@/lib/estimateUsage';

interface Props {
  currentCount: number;
  onClose: () => void;
  onSaved: () => void;
}

export default function AddKeywordModal({ currentCount, onClose, onSaved }: Props) {
  const [keyword, setKeyword] = useState('');
  const [searchEngine, setSearchEngine] = useState('tavily');
  const [intervalMin, setIntervalMin] = useState(480);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const usage = estimateMonthlyUsage(intervalMin, currentCount + 1);

  async function handleSave() {
    setError('');
    setSaving(true);
    const res = await fetch('/api/keywords', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword, searchEngine, intervalMin }),
    });
    setSaving(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? '저장에 실패했어요.');
      return;
    }
    onSaved();
  }

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <p style={{ fontSize: 16, fontWeight: 500, marginBottom: 16 }}>새 키워드 등록</p>

        <label style={labelStyle}>키워드</label>
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="아이폰 18"
          style={{ width: '100%', marginBottom: 12 }}
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>검색엔진</label>
            <select value={searchEngine} onChange={(e) => setSearchEngine(e.target.value)} style={{ width: '100%' }}>
              <option value="tavily">Tavily</option>
              <option value="naver">Naver</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>확인 주기</label>
            <select
              value={intervalMin}
              onChange={(e) => setIntervalMin(Number(e.target.value))}
              style={{ width: '100%' }}
            >
              <option value={60}>1시간마다</option>
              <option value={120}>2시간마다</option>
              <option value={360}>6시간마다</option>
              <option value={480}>8시간마다</option>
              <option value={1440}>1일마다</option>
            </select>
          </div>
        </div>

        <div
          style={{
            padding: '10px 12px',
            borderRadius: 6,
            marginBottom: 16,
            fontSize: 12.5,
            background: usage.exceedsLimit ? '#fee' : usage.percentOfLimit > 70 ? '#ffedcc' : '#f5f5f5',
            color: usage.exceedsLimit ? '#c00' : '#666',
          }}
        >
          전체 키워드 {currentCount + 1}개 기준 월 {usage.total.toLocaleString()}건 사용 (무료 한도의{' '}
          {usage.percentOfLimit}%){usage.exceedsLimit && ' — 한도 초과 예상'}
        </div>

        {error && <p style={{ color: '#c00', fontSize: 13, marginBottom: 12 }}>{error}</p>}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose}>취소</button>
          <button onClick={handleSave} disabled={saving || !keyword.trim()}>
            {saving ? '저장 중...' : '키워드 저장'}
          </button>
        </div>
      </div>
    </div>
  );
}

const overlayStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.4)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};
const modalStyle: CSSProperties = {
  background: '#fff',
  borderRadius: 12,
  padding: 20,
  width: 360,
};
const labelStyle: CSSProperties = {
  display: 'block',
  fontSize: 13,
  color: '#888',
  marginBottom: 6,
};
