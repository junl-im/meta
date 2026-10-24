import { defineConfig } from 'vite';

// 기존 dist/ 원본 일러스트와 정적 운세 엔진은 삭제하지 않습니다.
// 기능별 TS 모듈을 빌드해 dist/experience.js 로만 출력합니다.
export default defineConfig({
  base: './',
  publicDir: false,
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    lib: {
      entry: 'src/experience.ts',
      formats: ['es'],
      fileName: () => 'experience.js'
    }
  }
});
