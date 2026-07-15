'use client';

import { useState } from 'react';
import { estimateMonthlyUsage } from '@/lib/estimateUsage';

export interface KeywordFormValue {
  id?: number;
  keyword: string;
  searchEngine: string;
  intervalMin: number;
}

interface Props {
  mode: 'create' | 'edit';
  initialValue?: KeywordFormValue;
  currentCount: number; // 수정 모드에서는 본인 자신을 뺀 나머지 활성 키워드 수
  onClose: () => void;
  onSaved: () => void;
}

const INTERVAL_OPTIONS = [
  { value: 60, label: '1시간마다' },
  { value: 120, label: '2시간마다' },
  { value: 360, label: '6시간마다' },
  { value: 480, label: '8시간마다' },
  { value: 1440, label: '1일마다' },
];

export default function KeywordModal({ mode, initialValue, currentCount, onClose, onSaved }: Props) {
  const [keyword, setKeyword] = useState(initialValue?.keyword ?? '');
  const [searchEngine, setSearchEngine] = useState(initialValue?.searchEngine ?? 'tavily');
  const [intervalMin, setIntervalMin] = useState(initialValue?.intervalMin ?? 480);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // 수정 모드에서는 이 키워드 자신도 포함해서 계산 (내용이 바뀌어도 개수는 그대로니까)
  const usage = estimateMonthlyUsage(intervalMin, currentCount + 1);

  async function handleSave() {
    setError('');
    setSaving(true);

    const url = mode === 'create' ? '/api/keywords' : `/api/keywords/${initialValue?.id}`;
    const method = mode === 'create' ? 'POST' : 'PATCH';

    const res = await fetch(url, {
      method,
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

  const usageBoxClass = usage.exceedsLimit ? 'usage-box danger' : usage.percentOfLimit > 70 ? 'usage-box warning' : 'usage-box';

  return (
    <div className="modal-overlay">
      <div className="modal-panel">
        <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 18 }}>
          {mode === 'create' ? '새 키워드 등록' : '키워드 수정'}
        </p>

        <label className="field-label">키워드</label>
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="아이폰 18"
          style={{ marginBottom: 12 }}
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label className="field-label">검색엔진</label>
            <select value={searchEngine} onChange={(e) => setSearchEngine(e.target.value)}>
              <option value="tavily">Tavily</option>
              <option value="naver">Naver</option>
            </select>
          </div>
          <div>
            <label className="field-label">확인 주기</label>
            <select value={intervalMin} onChange={(e) => setIntervalMin(Number(e.target.value))}>
              {INTERVAL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={usageBoxClass} style={{ marginBottom: 16 }}>
          전체 키워드 {currentCount + 1}개 기준 월 {usage.total.toLocaleString()}건 사용 (무료 한도의{' '}
          {usage.percentOfLimit}%){usage.exceedsLimit && ' — 한도 초과 예상'}
        </div>

        {error && <p style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 12 }}>{error}</p>}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose}>취소</button>
          <button className="primary" onClick={handleSave} disabled={saving || !keyword.trim()}>
            {saving ? '저장 중...' : mode === 'create' ? '키워드 저장' : '수정 저장'}
          </button>
        </div>
      </div>
    </div>
  );
}
