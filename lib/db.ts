import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL 환경변수가 설정되지 않았습니다.');
}

const rawSql = neon(process.env.DATABASE_URL);

// Neon 무료 티어는 idle 상태면 컴퓨트가 잠들어 있다가, 첫 요청에 깨어나는 데
// 짧은 지연이 생길 수 있음. 그 사이 타임아웃 나면 한 번만 재시도.
export async function sql(strings: TemplateStringsArray, ...values: any[]) {
  try {
    return await rawSql(strings, ...values);
  } catch (err: any) {
    const isWakeupTimeout =
      err?.sourceError?.code === 'ETIMEDOUT' || err?.cause?.code === 'ETIMEDOUT';

    if (isWakeupTimeout) {
      console.warn('Neon 컴퓨트 기동 지연으로 재시도합니다...');
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return await rawSql(strings, ...values);
    }
    throw err;
  }
}
