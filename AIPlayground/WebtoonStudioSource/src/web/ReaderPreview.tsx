import React,{useEffect,useRef,useState} from 'react'
import type {ProjectV4} from '@core/types'
import {READER_DEVICES} from '@core/readerPreview'
import type {ReaderDeviceId} from '@core/readerPreview'
import {renderDraftPages} from './pngExport'

export function ReaderPreview({project,onClose}:{project:ProjectV4;onClose:()=>void}){
  const [pages,setPages]=useState<string[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true),[device,setDevice]=useState<ReaderDeviceId>('standard'),closeRef=useRef<HTMLButtonElement>(null),dialogRef=useRef<HTMLDivElement>(null)
  useEffect(()=>{
    let active=true;const urls:string[]=[],controller=new AbortController()
    const previouslyFocused=document.activeElement instanceof HTMLElement?document.activeElement:null
    closeRef.current?.focus()
    const key=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();onClose();return}if(event.key!=='Tab')return;const items=Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled),select:not(:disabled),[tabindex="0"]')||[]);if(!items.length)return;const index=items.indexOf(document.activeElement as HTMLElement);if(event.shiftKey&&(index<=0)){event.preventDefault();items.at(-1)?.focus()}else if(!event.shiftKey&&(index<0||index===items.length-1)){event.preventDefault();items[0].focus()}}
    document.addEventListener('keydown',key)
    void (async()=>{try{for await(const page of renderDraftPages(project,controller.signal)){if(!active)return;urls.push(URL.createObjectURL(new Blob([page.bytes as BlobPart],{type:'image/png'})));setPages([...urls])}if(active)setLoading(false)}catch(reason){if(active){setError(reason instanceof Error?reason.message:'미리보기를 만들지 못했습니다.');setLoading(false)}}})()
    return()=>{active=false;controller.abort();previouslyFocused?.focus();document.removeEventListener('keydown',key);for(const url of urls)URL.revokeObjectURL(url)}
  },[project,onClose])
  return <div ref={dialogRef} className="web-reader-overlay" role="dialog" aria-modal="true" aria-labelledby="web-reader-title"><div className="web-reader-window"><header><div><strong id="web-reader-title">독자 미리보기</strong><span>{project.title} · {project.episode}</span></div><button ref={closeRef} type="button" onClick={onClose}>편집으로 돌아가기</button></header><label className="web-reader-device">화면 너비<select aria-label="독자 화면 너비" value={device} onChange={event=>setDevice(event.target.value as ReaderDeviceId)}>{READER_DEVICES.map(item=><option key={item.id} value={item.id}>{item.label} · {item.width}px</option>)}</select></label><div style={{maxWidth:READER_DEVICES.find(item=>item.id===device)?.width}} className="web-reader-scroll" tabIndex={0} aria-label="원고 미리보기 스크롤">{error&&<p role="alert">{error}</p>}{pages.map((src,index)=><img key={src} src={src} alt={`원고 ${index+1}페이지`} loading={index?'lazy':'eager'}/>)}{loading&&<p role="status">원고를 준비하고 있습니다…</p>}</div><p className="web-reader-note">PNG 초안과 같은 방식으로 표시합니다. 최종 연재 전 출력 결과를 확인해 주세요.</p></div></div>
}