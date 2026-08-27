'use client';

import { useRef, useState } from 'react';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password || submitting) return;

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? '비밀번호가 올바르지 않아요.');
        setPassword('');
        inputRef.current?.focus();
        return;
      }

      // 미들웨어가 새 쿠키를 인식하도록 완전히 새로 이동(클라이언트 라우팅 아님)
      window.location.href = '/';
    } catch {
      setError('서버에 연결할 수 없어요. 잠시 후 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-page)',
        padding: 20,
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: '100%',
          maxWidth: 320,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: '32px 28px',
          boxShadow: '0 12px 40px rgba(0,0,0,0.08)',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: 'var(--accent-bg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}
        >
          <LockIcon />
        </div>

        <p style={{ fontSize: 15, fontWeight: 600, margin: '0 0 20px' }}>비밀번호를 입력해주세요</p>

        <input
          ref={inputRef}
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value.replace(/[^0-9]/g, ''))}
          disabled={submitting}
          placeholder="●●●●●●"
          style={{ textAlign: 'center', letterSpacing: 4, fontSize: 18, marginBottom: 14 }}
        />

        {error && <p style={{ color: 'var(--danger)', fontSize: 13, margin: '0 0 14px' }}>{error}</p>}

        <button
          type="submit"
          className="primary"
          disabled={!password || submitting}
          style={{ width: '100%' }}
        >
          {submitting ? '확인 중...' : '확인'}
        </button>
      </form>
    </div>
  );
}

function LockIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}