import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'
import {fileURLToPath} from 'node:url'
import {resolve} from 'node:path'

const here=fileURLToPath(new URL('.',import.meta.url))
export default defineConfig({
  root:resolve(here,'src/web'),
  plugins:[react()],
  base:'./',
  build:{outDir:resolve(here,'dist-web'),emptyOutDir:true},
  resolve:{alias:{'@core':resolve(here,'src/core')}}
})
