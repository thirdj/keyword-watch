// app/layout.tsx
export const metadata = {
  title: '키워드 워치',
  description: '관심 키워드를 감시하고 새 결과가 있으면 알려주는 도구',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}