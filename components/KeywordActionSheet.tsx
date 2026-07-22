'use client';

// 모바일/데스크톱 공통 키워드 카드의 "..." 버튼을 누르면 뜨는 바텀시트.
// "기사 보기"는 카드에 상시 노출되는 버튼으로 옮겨서 여기엔 수정/삭제만 남았다.
// 나중에 "지금 확인"/"복제"/"일시중지" 같은 기능이 생기면
// <button className="sheet-item"> 한 줄만 더 추가하면 되는 구조.
interface Props {
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export default function KeywordActionSheet({ onEdit, onDelete, onClose }: Props) {
  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet-panel" onClick={(e) => e.stopPropagation()} role="menu">
        <div className="sheet-handle" aria-hidden="true" />

        <button type="button" className="sheet-item" onClick={onEdit}>
          <EditIcon />
          <span>수정</span>
        </button>

        <button type="button" className="sheet-item danger" onClick={onDelete}>
          <TrashIcon />
          <span>삭제</span>
        </button>
      </div>
    </div>
  );
}

function EditIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}