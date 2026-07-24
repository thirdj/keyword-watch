'use client';

import { useEffect, useRef, useState } from 'react';

export interface KeywordFormValue {
  id?: number;
  keyword: string;
  searchEngines: string[];
  intervalMin: number;
}

interface Props {
  mode: 'create' | 'edit';
  initialValue?: KeywordFormValue;
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

// Tavily/Daum은 뉴스 전용 API가 아니라 일반 웹검색이라 오탐이 잦아서 제외함.
// Google RSS / Naver News는 둘 다 진짜 뉴스 전용이라 훨씬 안정적.
const ENGINE_OPTIONS = [
  { value: 'google_rss', label: 'Google RSS', color: '#4285f4' },
  { value: 'naver', label: 'Naver', color: '#03c75a' },
];

const MAX_ENGINES = 2;

export default function KeywordModal({ mode, initialValue, onClose, onSaved }: Props) {
  const [keyword, setKeyword] = useState(initialValue?.keyword ?? '');
  const [searchEngines, setSearchEngines] = useState<string[]>(initialValue?.searchEngines ?? ['google_rss']);
  const [intervalMin, setIntervalMin] = useState(initialValue?.intervalMin ?? 480);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const keywordInputRef = useRef<HTMLInputElement>(null);

  // 모달이 열리는 순간 키워드 입력창에 바로 포커스
  useEffect(() => {
    keywordInputRef.current?.focus();
  }, []);

  function toggleEngine(value: string) {
    setSearchEngines((prev) => {
      if (prev.includes(value)) {
        // 최소 1개는 남겨야 함
        if (prev.length === 1) return prev;
        return prev.filter((e) => e !== value);
      }
      if (prev.length >= MAX_ENGINES) return prev;
      return [...prev, value];
    });
  }

  async function handleSave() {
    setError('');
    setSaving(true);

    const url = mode === 'create' ? '/api/keywords' : `/api/keywords/${initialValue?.id}`;
    const method = mode === 'create' ? 'POST' : 'PATCH';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword, searchEngines, intervalMin }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? '저장에 실패했어요.');
        return;
      }
      onSaved();
    } catch {
      setError('서버에 연결할 수 없어요. 잠시 후 다시 시도해주세요.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-panel">
        <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 18 }}>
          {mode === 'create' ? '새 키워드 등록' : '키워드 수정'}
        </p>

        <label className="field-label">키워드</label>
        <input
          ref={keywordInputRef}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="아이폰 18"
          disabled={saving}
          style={{ marginBottom: 12 }}
        />

        <label className="field-label">
          검색엔진 <span style={{ fontWeight: 400, color: 'var(--text-secondary)' }}>(여러 엔진 결과를 합쳐서 확인해요)</span>
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          {ENGINE_OPTIONS.map((opt) => {
            const checked = searchEngines.includes(opt.value);
            const disabledOption = saving || (!checked && searchEngines.length >= MAX_ENGINES);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggleEngine(opt.value)}
                disabled={disabledOption}
                aria-pressed={checked}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 7,
                  fontSize: 13,
                  fontWeight: checked ? 600 : 400,
                  height: 34,
                  padding: '0 12px',
                  lineHeight: 1,
                  whiteSpace: 'nowrap',
                  border: `1px solid ${checked ? 'var(--accent)' : 'var(--border)'}`,
                  background: checked ? 'var(--accent-bg)' : 'transparent',
                  color: checked ? 'var(--accent)' : 'var(--text-primary)',
                  borderRadius: 999,
                  cursor: disabledOption ? 'not-allowed' : 'pointer',
                  opacity: disabledOption ? 0.4 : 1,
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: opt.color,
                    flexShrink: 0,
                  }}
                />
                {opt.label}
              </button>
            );
          })}
        </div>

        <label className="field-label">확인 주기</label>
        <select
          value={intervalMin}
          onChange={(e) => setIntervalMin(Number(e.target.value))}
          disabled={saving}
          style={{ marginBottom: 12 }}
        >
          {INTERVAL_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {error && <p style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 12 }}>{error}</p>}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} disabled={saving}>
            취소
          </button>
          <button className="primary" onClick={handleSave} disabled={saving || !keyword.trim() || searchEngines.length === 0}>
            {saving ? '저장 중...' : mode === 'create' ? '키워드 저장' : '수정 저장'}
          </button>
        </div>
      </div>
    </div>
  );
}