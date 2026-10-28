import React,{useEffect,useRef,useState} from 'react'
import {unzipSync} from 'fflate'
import type {ProjectV4} from '@core/types'
import {exportDraftPng} from './pngExport'

export function ReaderPreview({project,onClose}:{project:ProjectV4;onClose:()=>void}){
  const [pages,setPages]=useState<string[]>([]),[error,setError]=useState(''),closeRef=useRef<HTMLButtonElement>(null)
  useEffect(()=>{
    let active=true;const urls:string[]=[]
    closeRef.current?.focus()
    const key=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();onClose()}}
    document.addEventListener('keydown',key)
    void exportDraftPng(project).then(bytes=>{if(!active)return;const files=unzipSync(bytes);for(const name of Object.keys(files).filter(name=>name.endsWith('.png')).sort()){urls.push(URL.createObjectURL(new Blob([files[name] as BlobPart],{type:'image/png'})))}if(active)setPages([...urls])}).catch(reason=>{if(active)setError(reason instanceof Error?reason.message:'미리보기를 만들지 못했습니다.')})
    return()=>{active=false;document.removeEventListener('keydown',key);for(const url of urls)URL.revokeObjectURL(url)}
  },[project,onClose])
  return <div className="web-reader-overlay" role="dialog" aria-modal="true" aria-labelledby="web-reader-title"><div className="web-reader-window"><header><div><strong id="web-reader-title">독자 미리보기</strong><span>{project.title} · {project.episode}</span></div><button ref={closeRef} type="button" onClick={onClose}>편집으로 돌아가기</button></header><div className="web-reader-scroll" tabIndex={0} aria-label="원고 미리보기 스크롤">{error?<p role="alert">{error}</p>:pages.length?pages.map((src,index)=><img key={src} src={src} alt={`원고 ${index+1}페이지`} loading={index?'lazy':'eager'}/>):<p role="status">원고를 준비하고 있습니다…</p>}</div><p className="web-reader-note">PNG 초안과 같은 방식으로 표시합니다. 최종 연재 전 출력 결과를 확인해 주세요.</p></div></div>
}