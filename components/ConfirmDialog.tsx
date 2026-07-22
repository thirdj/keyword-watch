'use client';

// 삭제처럼 되돌릴 수 없는 액션에 쓰는 범용 확인 다이얼로그.
// 브라우저 기본 confirm()은 모바일에서 스타일을 못 입혀서 이질감이 크므로 대체.
interface Props {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirming?: boolean;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = '확인',
  cancelLabel = '취소',
  confirming = false,
  danger = true,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="confirm-panel" onClick={(e) => e.stopPropagation()} role="alertdialog" aria-modal="true">
        <p className="confirm-title">{title}</p>
        <p className="confirm-message">{message}</p>
        <div className="confirm-actions">
          <button onClick={onCancel} disabled={confirming}>
            {cancelLabel}
          </button>
          <button className={danger ? 'danger-solid' : 'primary'} onClick={onConfirm} disabled={confirming}>
            {confirming ? '처리 중...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}