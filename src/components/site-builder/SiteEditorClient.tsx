'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import type { SiteContent } from '@/types/database'
import { getTheme, SiteRenderer, type ProductItem } from './templates/SiteRenderer'
import { FONTS, findFont, fontUrl } from './fonts'
import WizardSitio from './WizardSitio'

type TemplateId = 'moderna' | 'clasica' | 'dark' | 'vibrante' | 'elegante' | 'minimalista' | 'bold' | 'sunset' | 'glass' | 'neon' | 'glass3d' | 'cosmic' | 'retro'
interface Service { name: string; description: string; price: string; image?: string; featured?: boolean }

interface Props {
  businessId: string; businessName: string; businessSlug: string
  initialContent: SiteContent; initialColor: string; initialTemplate: string
  initialLogo: string | null; initialCover: string | null; isPublished: boolean
  products?: ProductItem[]
}

const COLORS = ['#6366f1','#8b5cf6','#ec4899','#06b6d4','#10b981','#f59e0b','#ef4444','#1e40af','#111827','#059669']

const GALLERY_FRAMES = [
  { id:'rounded',  label:'Redondeado' },
  { id:'square',   label:'Cuadrado'   },
  { id:'circle',   label:'Circular'   },
  { id:'shadow',   label:'Sombra'     },
  { id:'border',   label:'Borde'      },
  { id:'polaroid', label:'Polaroid'   },
]
const LOGO_SIZES   = [{ id:'sm',label:'S'},{id:'md',label:'M'},{id:'lg',label:'L'},{id:'xl',label:'XL'}]
const LOGO_SHAPES  = [
  { id:'default', label:'Normal'     },
  { id:'rounded', label:'Redondeado' },
  { id:'circle',  label:'Circular'   },
  { id:'square',  label:'Cuadrado'   },
]
const LOGO_SIZE_MAP: Record<string,number> = { sm:32, md:52, lg:70, xl:96 }

function galleryFrameStyle(frame: string, color: string): React.CSSProperties {
  switch(frame) {
    case 'square':   return { borderRadius:0,   overflow:'hidden', aspectRatio:'1' }
    case 'circle':   return { borderRadius:'50%',overflow:'hidden', aspectRatio:'1', boxShadow:'0 4px 20px rgba(0,0,0,0.25)' }
    case 'shadow':   return { borderRadius:12,  overflow:'hidden', aspectRatio:'1', boxShadow:'0 20px 60px rgba(0,0,0,0.55)' }
    case 'border':   return { borderRadius:12,  overflow:'hidden', aspectRatio:'1', outline:`3px solid ${color}`, outlineOffset:3 }
    case 'polaroid': return { background:'white',padding:'8px 8px 36px',borderRadius:4,boxShadow:'0 8px 32px rgba(0,0,0,0.35)' }
    default:         return { borderRadius:16,  overflow:'hidden', aspectRatio:'1', boxShadow:'0 4px 16px rgba(0,0,0,0.12)' }
  }
}
function galleryImgStyle(frame: string): React.CSSProperties {
  return frame==='polaroid'
    ? { width:'100%', height:180, objectFit:'cover', display:'block', borderRadius:2 }
    : { width:'100%', height:'100%', objectFit:'cover' }
}
function logoImgStyle(shape: string, size: number): React.CSSProperties {
  const base: React.CSSProperties = { height:size, objectFit:'contain', display:'block' }
  if (shape==='circle') return {...base, width:size, borderRadius:'50%', objectFit:'cover'}
  if (shape==='rounded') return {...base, maxWidth:size*4, borderRadius:Math.round(size*0.18)}
  if (shape==='square')  return {...base, width:size, objectFit:'cover', borderRadius:4}
  return {...base, maxWidth:size*4}
}
const TEMPLATES: {id: TemplateId; label: string; badge?: string}[] = [
  {id:'moderna',label:'Moderna'},{id:'clasica',label:'Clásica'},{id:'minimalista',label:'Minimalista'},
  {id:'bold',label:'Bold'},{id:'sunset',label:'Sunset'},{id:'vibrante',label:'Vibrante'},
  {id:'glass',label:'Glass'},{id:'elegante',label:'Elegante'},{id:'dark',label:'Dark'},
  {id:'neon',label:'Neon',badge:'nuevo'},{id:'glass3d',label:'Glass 3D',badge:'nuevo'},
  {id:'cosmic',label:'Cosmic',badge:'nuevo'},{id:'retro',label:'Retro',badge:'nuevo'},
]
const SECTIONS_LIST = [
  {key:'hero',label:'Portada'},{key:'nosotros',label:'Nosotros'},{key:'servicios',label:'Servicios'},
  {key:'precios',label:'Precios'},{key:'pasos',label:'Cómo funciona'},{key:'beneficios',label:'Beneficios'},
  {key:'resenas',label:'Reseñas'},{key:'faq',label:'Preguntas frecuentes'},
  {key:'galeria',label:'Galería'},{key:'contacto',label:'Contacto'},
]

function deepSet(obj: Record<string,unknown>, path: string, val: unknown): Record<string,unknown> {
  const r = JSON.parse(JSON.stringify(obj)) as Record<string,unknown>
  const keys = path.split('.')
  let cur = r as Record<string,unknown>
  for (let i=0; i<keys.length-1; i++) cur = cur[keys[i]] as Record<string,unknown>
  cur[keys[keys.length-1]] = val
  return r
}

const eBase: React.CSSProperties = {outline:'none',cursor:'text',borderRadius:4,transition:'box-shadow 0.15s, background 0.15s'}

function onFocusEdit(e: React.FocusEvent<HTMLElement>) {
  e.currentTarget.style.boxShadow='0 0 0 2px rgba(99,102,241,0.55)'
  e.currentTarget.style.background='rgba(99,102,241,0.07)'
}
function clearEdit(el: HTMLElement) { el.style.boxShadow=''; el.style.background='' }
function onHoverEdit(e: React.MouseEvent<HTMLElement>) {
  if (document.activeElement!==e.currentTarget)
    e.currentTarget.style.boxShadow='0 0 0 1.5px rgba(99,102,241,0.35)'
}
function onLeaveHover(e: React.MouseEvent<HTMLElement>) {
  if (document.activeElement!==e.currentTarget) e.currentTarget.style.boxShadow=''
}

// ── ✅ Service card como componente separado — evita el bug de hooks en map ──
function ServiceCard({ s, i, color, dark, vib, onChangeSvc, onUploadImg, onRemove, onToggleFeatured }: {
  s: Service; i: number; color: string; dark: boolean; vib: boolean
  onChangeSvc: (i: number, f: keyof Service, v: string) => void
  onUploadImg: (i: number, file: File) => void
  onRemove: (i: number) => void
  onToggleFeatured: (i: number) => void
}) {
  const imgRef = useRef<HTMLInputElement>(null)  // ✅ hook en componente, no en map
  const fg    = dark||vib ? 'white' : '#111827'
  const muted = dark ? 'rgba(255,255,255,0.5)' : vib ? 'rgba(255,255,255,0.75)' : '#9ca3af'
  const bg    = dark ? 'rgba(255,255,255,0.04)' : vib ? 'rgba(255,255,255,0.15)' : 'white'
  const brd   = s.featured ? color : (dark ? 'rgba(255,255,255,0.08)' : '#f0f0f0')

  return (
    <div style={{background:bg,border:`1.5px solid ${brd}`,borderRadius:14,overflow:'hidden',position:'relative'}}>
      {/* Badge "Más popular" si está marcado */}
      {s.featured && (
        <div style={{position:'absolute',top:0,left:'50%',transform:'translateX(-50%)',
                     background:color,color:'white',fontSize:'0.625rem',fontWeight:700,
                     padding:'2px 10px',borderRadius:'0 0 8px 8px',letterSpacing:'0.04em',
                     textTransform:'uppercase',zIndex:3,whiteSpace:'nowrap'}}>
          Más popular
        </div>
      )}
      <button onClick={()=>onRemove(i)}
              style={{position:'absolute',top:6,right:6,zIndex:2,width:22,height:22,borderRadius:'50%',border:'none',background:'rgba(239,68,68,0.2)',color:'#fca5a5',fontSize:11,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
      <input ref={imgRef} type="file" accept="image/*" style={{display:'none'}}
             onChange={e=>{const f=e.target.files?.[0]; if(f) onUploadImg(i,f)}}/>
      <div onClick={()=>imgRef.current?.click()}
           style={{height:s.image?130:88,cursor:'pointer',background:s.image?`url(${s.image}) center/cover`:`${color}12`,display:'flex',alignItems:'center',justifyContent:'center'}}
           onMouseEnter={e=>(e.currentTarget.style.opacity='0.85')}
           onMouseLeave={e=>(e.currentTarget.style.opacity='1')}>
        {!s.image && <div style={{textAlign:'center'}}><div style={{fontSize:20,marginBottom:3}}>📷</div><p style={{fontSize:10,color:`${color}90`,fontWeight:600}}>Agregar imagen</p></div>}
      </div>
      <div style={{padding:'1rem 1.125rem'}}>
        <div contentEditable suppressContentEditableWarning
             style={{...eBase,fontWeight:700,color:fg,fontSize:'0.9375rem',marginBottom:'0.375rem'}}
             onFocus={onFocusEdit} onBlur={e=>{clearEdit(e.currentTarget);onChangeSvc(i,'name',e.currentTarget.innerText.trim())}}
             onMouseEnter={onHoverEdit} onMouseLeave={onLeaveHover}>{s.name}</div>
        <div contentEditable suppressContentEditableWarning
             style={{...eBase,color:muted,fontSize:'0.8125rem',lineHeight:1.6,marginBottom:'0.5rem'}}
             onFocus={onFocusEdit} onBlur={e=>{clearEdit(e.currentTarget);onChangeSvc(i,'description',e.currentTarget.innerText.trim())}}
             onMouseEnter={onHoverEdit} onMouseLeave={onLeaveHover}>{s.description}</div>
        <div style={{display:'flex',alignItems:'center',gap:'0.375rem',marginBottom:'0.625rem'}}>
          <span style={{fontSize:'0.75rem',color:muted}}>Precio:</span>
          <div contentEditable suppressContentEditableWarning
               style={{...eBase,color,fontWeight:700,fontSize:'0.875rem',minWidth:40}}
               onFocus={onFocusEdit} onBlur={e=>{clearEdit(e.currentTarget);onChangeSvc(i,'price',e.currentTarget.innerText.trim())}}
               onMouseEnter={onHoverEdit} onMouseLeave={onLeaveHover}>{s.price||'Agregar precio'}</div>
        </div>
        {/* Toggle "Más popular" */}
        <button onClick={()=>onToggleFeatured(i)}
                style={{width:'100%',padding:'0.375rem',borderRadius:7,border:`1px solid ${s.featured?color:'rgba(99,102,241,0.2)'}`,
                        background:s.featured?`${color}18`:'transparent',
                        color:s.featured?color:muted,fontSize:'0.75rem',fontWeight:s.featured?700:400,
                        cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:5,
                        transition:'all 0.15s'}}>
          {s.featured ? '⭐ Más popular (activo)' : '☆ Marcar como más popular'}
        </button>
      </div>
    </div>
  )
}

export default function SiteEditorClient({
  businessId, businessName, businessSlug,
  initialContent, initialColor, initialTemplate, initialLogo, initialCover, isPublished: initPublished, products = [],
}: Props) {
  const [content,   setContent]   = useState<SiteContent>(initialContent)
  const [name,      setName]      = useState(businessName)
  const [color,     setColor]     = useState(initialColor)
  const [template,  setTemplate]  = useState<TemplateId>((initialTemplate as TemplateId)||'moderna')
  const [colorH,    setColorH]    = useState(initialContent.theme?.headingColor ?? '')
  const [colorT,    setColorT]    = useState(initialContent.theme?.textColor ?? '')
  const [colorBg,   setColorBg]   = useState(initialContent.theme?.bgColor ?? '')
  const [fontId,    setFontId]    = useState(initialContent.theme?.fontId ?? 'inter')
  const [fontOpen,  setFontOpen]  = useState(false)
  const [logo,      setLogo]      = useState<string|null>(initialLogo)
  const [cover,     setCover]     = useState<string|null>(initialCover)
  const [gallery,   setGallery]   = useState<string[]>((initialContent.gallery??[]) as string[])
  const [easy,      setEasy]      = useState(true)
  const [mode,      setMode]      = useState<'edit'|'preview'>('edit')
  const [viewport,  setViewport]  = useState<'desktop'|'movil'>('desktop')
  const [panel,     setPanel]     = useState<'plantilla'|'secciones'|'acciones'>('plantilla')
  const [sections,  setSections]  = useState(()=>{
    const hid = initialContent.theme?.hiddenSections ?? []
    const all = {hero:true,nosotros:true,servicios:true,precios:true,pasos:true,beneficios:true,resenas:true,faq:true,galeria:true,contacto:true}
    return Object.fromEntries(Object.entries(all).map(([k])=>[k,!hid.includes(k)])) as typeof all
  })
  const [saveState, setSaveState] = useState<'saved'|'saving'|'unsaved'>('saved')
  const [published, setPublished] = useState(initPublished)
  const [publishing,setPublishing]= useState(false)

  const logoRef   = useRef<HTMLInputElement>(null)
  const coverRef  = useRef<HTMLInputElement>(null)
  const galleryRef= useRef<HTMLInputElement>(null)
  const font = findFont(fontId)
  const [srcDoc, setSrcDoc] = useState('')
  const fontIdRef = useRef(fontId)
  const sectionsRef = useRef(sections)
  const logoValRef = useRef(logo)
  const coverValRef = useRef(cover)
  useEffect(()=>{ logoValRef.current = logo },[logo])
  useEffect(()=>{ coverValRef.current = cover },[cover])
  useEffect(()=>{ sectionsRef.current = sections },[sections])
  useEffect(()=>{
    fontIdRef.current = fontId
    const id='amelia-font-link'
    let l=document.getElementById(id) as HTMLLinkElement|null
    if(!l){l=document.createElement('link');l.id=id;l.rel='stylesheet';document.head.appendChild(l)}
    l.href=fontUrl(fontId)
  },[fontId])

  const colorHRef  = useRef(colorH)
  const colorTRef  = useRef(colorT)
  const colorBgRef = useRef(colorBg)
  useEffect(()=>{ colorHRef.current  = colorH  },[colorH])
  useEffect(()=>{ colorTRef.current  = colorT  },[colorT])
  useEffect(()=>{ colorBgRef.current = colorBg },[colorBg])

  useEffect(()=>{
    if(mode!=='preview') return
    let off=false
    const tm=setTimeout(async()=>{
      const { renderToStaticMarkup } = await import('react-dom/server')
      const html = renderToStaticMarkup(
        <SiteRenderer
          content={{...content,theme:{...(content.theme??{}),headingColor:colorH||undefined,textColor:colorT||undefined,bgColor:colorBg||undefined,fontId,hiddenSections:Object.entries(sections).filter(([,v])=>!v).map(([k])=>k)}}}
          color={color} template={template} name={name} logo={logo} cover={cover}
          gallery={gallery} fontFamily={font.family} slug={businessSlug} products={products}
        />
      )
      const css = Array.from(document.styleSheets).map(sh=>{try{return Array.from(sh.cssRules).map(r=>r.cssText).join(' ')}catch{return ''}}).join(' ')
      if(!off) setSrcDoc(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="${fontUrl(fontId)}"><style>${css}</style></head><body>${html}</body></html>`)
    },200)
    return ()=>{off=true;clearTimeout(tm)}
  },[mode,content,colorH,colorT,colorBg,fontId,sections,color,template,name,logo,cover,gallery,font.family,businessSlug,products])

  const save = useCallback(async (c:SiteContent,n:string,col:string,tpl:TemplateId) => {
    setSaveState('saving')
    const withTheme:SiteContent = {
      ...c,
      theme: {
        ...(c.theme ?? {}),            // preserva galleryFrame, logoShape, logoSize, etc.
        headingColor: colorHRef.current  || undefined,
        textColor:    colorTRef.current  || undefined,
        bgColor:      colorBgRef.current || undefined,
        fontId:       fontIdRef.current,
        hiddenSections: Object.entries(sectionsRef.current).filter(([,v])=>!v).map(([k])=>k),
      }
    }
    try {
      await fetch('/api/save-site',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({business_id:businessId,content:withTheme,business_name:n,template_id:tpl,primary_color:col,logo_url:logoValRef.current,cover_url:coverValRef.current})})
      setSaveState('saved')
    } catch { setSaveState('unsaved') }
  },[businessId])

  // Sin autosave — el usuario guarda manualmente con el botón "Guardar"
  const sched = useCallback((_c:SiteContent,_n:string,_col:string,_tpl:TemplateId) => {
    setSaveState('unsaved')
  },[])

  const setThemeField = (key: string, val: string) => {
    setContent(prev => ({ ...prev, theme: { ...(prev.theme ?? {}), [key]: val } }))
    setSaveState('unsaved')
  }

  const edit = useCallback((path:string,val:string) => {
    setContent(prev=>{
      const next=deepSet(prev as unknown as Record<string,unknown>,path,val) as unknown as SiteContent
      sched(next,name,color,template); return next
    })
  },[name,color,template,sched])

  const editTitle = useCallback((key:string, val:string) => {
    setContent(prev=>{
      const next = { ...prev, sectionTitles: { ...(prev.sectionTitles??{}), [key]: val } }
      sched(next,name,color,template); return next
    })
  },[name,color,template,sched])

  const editName = useCallback((val:string)=>{setName(val);sched(content,val,color,template)},[content,color,template,sched])
  const setCol   = (c:string)=>{setColor(c);sched(content,name,c,template)}
  const setTpl   = (t:TemplateId)=>{setTemplate(t);sched(content,name,color,t)}

  const editSvc = useCallback((i:number,f:keyof Service,v:string)=>{
    setContent(prev=>{
      const svcs=[...prev.services] as Service[]; svcs[i]={...svcs[i],[f]:v}
      const next={...prev,services:svcs}; sched(next,name,color,template); return next
    })
  },[name,color,template,sched])

  const uploadSvcImg = useCallback(async(i:number,file:File)=>{
    const fd=new FormData(); fd.append('file',file); fd.append('type','gallery')
    const r=await fetch('/api/upload-image',{method:'POST',body:fd}); const d=await r.json()
    if(!r.ok){alert(d.error);return}; editSvc(i,'image',d.url)
  },[editSvc])

  const toggleFeatured = useCallback((i: number) => {
    setContent(prev => {
      const svcs = [...prev.services] as Service[]
      svcs.forEach((s, idx) => { svcs[idx] = { ...s, featured: idx === i ? !s.featured : false } })
      const next = { ...prev, services: svcs }
      sched(next, name, color, template)
      return next
    })
  }, [name, color, template, sched])

  const removeSvc=(i:number)=>{
    setContent(prev=>{const next={...prev,services:prev.services.filter((_,idx)=>idx!==i)};sched(next,name,color,template);return next})
  }
  const addSvc=()=>{
    setContent(prev=>{const next={...prev,services:[...prev.services,{name:'Nuevo servicio',description:'Descripción del servicio',price:'$0',image:''}]};sched(next,name,color,template);return next})
  }

  const upload=async(file:File,type:string):Promise<string|null>=>{
    const fd=new FormData(); fd.append('file',file); fd.append('type',type)
    const r=await fetch('/api/upload-image',{method:'POST',body:fd}); const d=await r.json()
    if(!r.ok){alert(d.error);return null}; return d.url
  }

  const publish=async()=>{
    setPublishing(true); await save(content,name,color,template)
    const r=await fetch('/api/publish',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({business_id:businessId})})
    if(r.ok) setPublished(true); setPublishing(false)
  }

  useEffect(()=>{ try{ if(localStorage.getItem('amelia-editor-easy')==='0') setEasy(false) }catch{} },[])
  useEffect(()=>{ setMode(easy?'preview':'edit') },[easy])
  const cambiarModo=(v:boolean)=>{ setEasy(v); try{localStorage.setItem('amelia-editor-easy',v?'1':'0')}catch{} }

  // Autoguardado: solo mientras el sitio es borrador (si ya está publicado, los cambios se publican al guardar)
  useEffect(()=>{
    if(saveState!=='unsaved'||published) return
    const tm=setTimeout(()=>{ save(content,name,color,template) },2500)
    return ()=>clearTimeout(tm)
  },[saveState,published,content,name,color,template,colorH,colorT,colorBg,fontId,sections,logo,cover,gallery,save])

  // ── Tema ────────────────────────────────────────────────
  const hasCover = !!(cover&&cover.trim().length>5)
  const th=getTheme(template,color,hasCover)
  const dark=th.dark||th.glass||th.bold; const vib=th.vib; const eleg=th.eleg; const mini=th.mini
  const over=th.over
  const pageBg=colorBg||th.pageBg
  const navBg=th.navBg
  const brd=th.border
  const muted=colorT||th.muted
  const sectBg=th.sectBg
  const navFg=colorH||th.sectFg
  const heroFg=colorH||th.fg
  const ctaBg=over?'white':color; const ctaFg=over?color:'white'
  const heroBg=hasCover
    ?`linear-gradient(rgba(0,0,0,0.45),rgba(0,0,0,0.45)), url(${cover}) center/cover`
    :(dark||th.neon||th.cosmic)?`radial-gradient(ellipse at 50% 0%, ${color}30, transparent 70%)`
    :vib?`linear-gradient(135deg,${color},${color}cc)`:(mini||th.retro)?'transparent':`linear-gradient(135deg,${color}14,${color}04)`

  const S: React.CSSProperties={fontSize:9,fontWeight:700,color:'#3d3d5c',letterSpacing:'0.12em',textTransform:'uppercase',marginBottom:8}

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100vh',background:'#13131f',fontFamily:'Inter,sans-serif'}}>

      {/* TOP BAR */}
      <div style={{display:'flex',alignItems:'center',gap:10,padding:'8px 16px',background:'#0f0f1a',borderBottom:'1px solid rgba(255,255,255,0.06)',flexShrink:0}}>
        <a href="/dashboard" style={{color:'#6b6b8a',fontSize:easy?14:12,textDecoration:'none'}}>{easy?'← Volver al inicio':'← Dashboard'}</a>
        <span style={{color:'#e2e8f0',fontSize:13,fontWeight:600}}>{easy?'Mi sitio web':'Editor visual'}</span>
        <span style={{background:published?'rgba(16,185,129,0.15)':'rgba(245,158,11,0.15)',color:published?'#6ee7b7':'#fcd34d',border:`1px solid ${published?'rgba(16,185,129,0.3)':'rgba(245,158,11,0.3)'}`,fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>
          {published?'PUBLICADO':'BORRADOR'}
        </span>
        <div style={{flex:1}}/>
        <div style={{display:'flex',background:'rgba(255,255,255,0.05)',borderRadius:8,padding:2}}>
          {(['desktop','movil'] as const).map(v=>(
            <button key={v} onClick={()=>setViewport(v)} style={{padding:'4px 12px',borderRadius:6,border:'none',cursor:'pointer',fontSize:11,fontWeight:600,fontFamily:'Inter,sans-serif',background:viewport===v?'rgba(99,102,241,0.3)':'transparent',color:viewport===v?'#a5b4fc':'#4b4b6b'}}>
              {v==='desktop'?(easy?'💻 Computador':'Desktop'):(easy?'📱 Celular':'Móvil')}
            </button>
          ))}
        </div>
        {!easy&&<button onClick={()=>cambiarModo(true)} style={{padding:'5px 12px',borderRadius:8,border:'1px solid rgba(16,185,129,0.4)',background:'rgba(16,185,129,0.12)',color:'#6ee7b7',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'Inter,sans-serif'}}>✨ Modo fácil</button>}
        {!easy&&<div style={{display:'flex',background:'rgba(255,255,255,0.05)',borderRadius:8,padding:2}}>
          {([['edit','✏️ Editar'],['preview','👁 Vista previa real']] as const).map(([m,l])=>(
            <button key={m} onClick={()=>setMode(m)} style={{padding:'4px 12px',borderRadius:6,border:'none',cursor:'pointer',fontSize:11,fontWeight:600,fontFamily:'Inter,sans-serif',background:mode===m?'rgba(16,185,129,0.25)':'transparent',color:mode===m?'#6ee7b7':'#4b4b6b'}}>{l}</button>
          ))}
        </div>}
        {!easy&&<>
        <span style={{fontSize:11,color:saveState==='saved'?'#10b981':saveState==='saving'?'#f59e0b':'#ef4444'}}>
          {saveState==='saved'?'● Guardado':saveState==='saving'?'⟳ Guardando...':'● Cambios sin guardar'}
        </span>
        {published&&<a href={`/sitio/${businessSlug}`} target="_blank" style={{fontSize:11,color:'#a5b4fc',border:'1px solid rgba(99,102,241,0.3)',padding:'4px 10px',borderRadius:6,textDecoration:'none'}}>Ver sitio ↗</a>}
        <button
          onClick={()=>save(content,name,color,template)}
          disabled={saveState==='saving'||saveState==='saved'}
          style={{background:saveState==='unsaved'?'rgba(16,185,129,0.15)':'rgba(255,255,255,0.05)',color:saveState==='unsaved'?'#6ee7b7':'#4b4b6b',border:`1px solid ${saveState==='unsaved'?'rgba(16,185,129,0.3)':'rgba(255,255,255,0.08)'}`,padding:'6px 14px',borderRadius:8,fontSize:12,fontWeight:700,cursor:saveState==='unsaved'?'pointer':'default',fontFamily:'Inter,sans-serif',transition:'all 0.2s'}}
        >
          {saveState==='saving'?'⟳ Guardando...':'💾 Guardar cambios'}
        </button>
        <button onClick={publish} disabled={publishing} style={{background:'linear-gradient(135deg,#6366f1,#8b5cf6)',color:'white',border:'none',padding:'6px 16px',borderRadius:8,fontSize:12,fontWeight:700,cursor:publishing?'not-allowed':'pointer',opacity:publishing?0.6:1,fontFamily:'Inter,sans-serif',boxShadow:'0 2px 12px rgba(99,102,241,0.4)'}}>
          {publishing?'Publicando...':published?'✓ Publicar cambios':'🚀 Publicar mi sitio'}
        </button>
        </>}
      </div>

      <div style={{display:'flex',flex:1,overflow:'hidden'}}>

        {/* PANEL IZQ */}
        {easy ? (
          <WizardSitio
            name={name} onName={editName}
            logo={logo} onLogo={async f=>{const u=await upload(f,'logo');if(u){setLogo(u);setSaveState('unsaved')}}} onLogoRemove={()=>{setLogo(null);setSaveState('unsaved')}}
            template={template} onTemplate={t=>setTpl(t as TemplateId)}
            color={color} onColor={setCol}
            content={content} onEdit={edit} onSvc={(i,f,v)=>editSvc(i,f,v)}
            published={published} publishing={publishing} onPublish={publish}
            slug={businessSlug} saveState={saveState} onAdvanced={()=>cambiarModo(false)}
          />
        ) : (
        <div style={{width:210,background:'#0f0f1a',borderRight:'1px solid rgba(255,255,255,0.06)',display:'flex',flexDirection:'column',flexShrink:0,overflowY:'auto'}}>
          <div style={{display:'flex',padding:'8px 8px 0',gap:2,borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
            {(['plantilla','secciones','acciones'] as const).map(p=>(
              <button key={p} onClick={()=>setPanel(p)} style={{flex:1,padding:'6px 2px',border:'none',cursor:'pointer',fontSize:12,fontWeight:700,borderRadius:'6px 6px 0 0',fontFamily:'Inter,sans-serif',textTransform:'capitalize',background:panel===p?'rgba(99,102,241,0.15)':'transparent',color:panel===p?'#a5b4fc':'#3d3d5c',borderBottom:panel===p?'2px solid #6366f1':'2px solid transparent'}}>
                {({plantilla:'Estilo',secciones:'Qué mostrar',acciones:'Otras acciones'} as const)[p]}
              </button>
            ))}
          </div>

          <div style={{flex:1,padding:10,overflowY:'auto'}}>

            {panel==='plantilla'&&(
              <div style={{display:'flex',flexDirection:'column',gap:14}}>
                <div>
                  <p style={S}>Nombre del negocio</p>
                  <input value={name} onChange={e=>{setName(e.target.value);sched(content,e.target.value,color,template)}}
                         style={{width:'100%',background:'rgba(255,255,255,0.04)',border:'1.5px solid rgba(255,255,255,0.08)',borderRadius:8,color:'#e2e8f0',fontSize:12,padding:'7px 10px',outline:'none',fontFamily:'Inter,sans-serif'}}/>
                </div>
                <div>
                  <p style={S}>Estilo del sitio</p>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
                    {TEMPLATES.map(t=>{
                      const previewBg = t.id==='dark'?'#0a0a0f':t.id==='neon'?'#05000f':t.id==='cosmic'?'#03030e':t.id==='glass3d'?'linear-gradient(135deg,#0b0f1a,#130d2e)':t.id==='bold'?'#111827':t.id==='glass'?'#0f172a':t.id==='vibrante'||t.id==='sunset'?`linear-gradient(135deg,${color},${color}bb)`:t.id==='elegante'?'#faf9f7':t.id==='retro'?'#fffef5':'white'
                      return (
                        <button key={t.id} onClick={()=>setTpl(t.id)} style={{background:template===t.id?'rgba(99,102,241,0.12)':'rgba(255,255,255,0.03)',border:`1.5px solid ${template===t.id?'rgba(99,102,241,0.45)':'rgba(255,255,255,0.06)'}`,borderRadius:8,padding:6,cursor:'pointer',textAlign:'left',fontFamily:'Inter,sans-serif',position:'relative'}}>
                          <div style={{height:28,borderRadius:5,marginBottom:4,background:previewBg,border:'1px solid rgba(255,255,255,0.06)',display:'flex',flexDirection:'column',padding:'3px 5px',gap:3}}>
                            <div style={{height:4,borderRadius:t.id==='retro'?0:2,background:t.id==='neon'?`linear-gradient(90deg,${color},${color}88)`:color,opacity:0.9,boxShadow:t.id==='neon'?`0 0 6px ${color}90`:'none'}}/><div style={{height:2,borderRadius:1,background:'rgba(128,128,128,0.25)'}}/>
                          </div>
                          <p style={{fontSize:10,fontWeight:600,color:template===t.id?'#a5b4fc':'#6b6b8a',margin:0}}>{t.label}</p>
                          {t.badge&&<span style={{position:'absolute',top:3,right:3,fontSize:8,fontWeight:700,background:'rgba(16,185,129,0.2)',color:'#34d399',padding:'1px 5px',borderRadius:4,textTransform:'uppercase',letterSpacing:'0.03em'}}>{t.badge}</span>}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div>
                  <p style={S}>Color principal</p>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:5,marginBottom:8}}>
                    {([
                      {id:'oceano',  label:'🌊 Océano',  color:'#0284c7', bg:'#f0f7ff'},
                      {id:'bosque',  label:'🌿 Bosque',  color:'#10b981', bg:'#0a1a0f'},
                      {id:'calido',  label:'☀️ Cálido',  color:'#f97316', bg:'#faf8f4'},
                      {id:'violeta', label:'💜 Violeta', color:'#8b5cf6', bg:'white'},
                      {id:'rosa',    label:'🌸 Rosa',    color:'#ec4899', bg:'white'},
                      {id:'coral',   label:'❤️ Coral',   color:'#ef4444', bg:'white'},
                    ] as const).map(p=>(
                      <button key={p.id} onClick={()=>setCol(p.color)}
                        style={{display:'flex',alignItems:'center',gap:6,padding:'5px 7px',borderRadius:7,
                          background:color===p.color?'rgba(255,255,255,0.1)':'rgba(255,255,255,0.03)',
                          border:`1.5px solid ${color===p.color?'rgba(255,255,255,0.3)':'rgba(255,255,255,0.06)'}`,
                          cursor:'pointer',fontFamily:'Inter,sans-serif'}}>
                        <div style={{width:14,height:14,borderRadius:4,background:p.color,flexShrink:0,boxShadow:`0 0 6px ${p.color}60`}}/>
                        <span style={{fontSize:10,fontWeight:500,color:color===p.color?'white':'#8b8bab',whiteSpace:'nowrap'}}>{p.label}</span>
                      </button>
                    ))}
                  </div>
                  <p style={{...S,marginBottom:4}}>Elegir otro color</p>
                  <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                    {COLORS.map(c=><button key={c} onClick={()=>setCol(c)} style={{width:24,height:24,borderRadius:6,background:c,border:'none',cursor:'pointer',outline:color===c?'3px solid white':'none',outlineOffset:1,transform:color===c?'scale(1.2)':'scale(1)',transition:'all 0.15s',boxShadow:color===c?`0 0 10px ${c}88`:'none'}}/>)}
                  </div>
                </div>
                {/* ── Color de títulos ── */}
                <div>
                  <p style={S}>Color de títulos</p>
                  <div style={{display:'flex',gap:4,flexWrap:'wrap',marginBottom:6}}>
                    {['','#111827','#ffffff','#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981'].map(c=>(
                      <button key={c||'auto'} onClick={()=>{setColorH(c);sched(content,name,color,template)}}
                              title={c||'Auto'}
                              style={{width:22,height:22,borderRadius:5,background:c||'linear-gradient(135deg,#6366f1,#ec4899)',border:`2px solid ${colorH===c?'white':'transparent'}`,cursor:'pointer',outline:colorH===c?`2px solid ${color}`:'none',outlineOffset:1,transition:'all 0.15s',fontSize:c?'0':'9px',color:'white',display:'flex',alignItems:'center',justifyContent:'center'}}>
                        {!c&&<span style={{fontSize:8,fontWeight:700,color:'white',textShadow:'0 0 3px rgba(0,0,0,0.8)'}}>A</span>}
                      </button>
                    ))}
                    <input type="color" value={colorH||'#111827'} onChange={e=>{setColorH(e.target.value);sched(content,name,color,template)}}
                           style={{width:22,height:22,borderRadius:5,border:'1px solid rgba(255,255,255,0.15)',cursor:'pointer',padding:0,background:'none'}}/>
                  </div>
                  {colorH&&<button onClick={()=>{setColorH('');sched(content,name,color,template)}} style={{fontSize:9,color:'#4b4b6b',background:'none',border:'none',cursor:'pointer',padding:0}}>↩ Auto</button>}
                </div>
                {/* ── Color de texto ── */}
                <div>
                  <p style={S}>Color de texto</p>
                  <div style={{display:'flex',gap:4,flexWrap:'wrap',marginBottom:6}}>
                    {['','#6b7280','#9ca3af','#111827','rgba(255,255,255,0.72)','#ffffff'].map(c=>(
                      <button key={c||'auto'} onClick={()=>{setColorT(c);sched(content,name,color,template)}}
                              title={c||'Auto'}
                              style={{width:22,height:22,borderRadius:5,background:c||'linear-gradient(135deg,#6366f1,#ec4899)',border:`2px solid ${colorT===c?'white':'transparent'}`,cursor:'pointer',outline:colorT===c?`2px solid ${color}`:'none',outlineOffset:1,transition:'all 0.15s',display:'flex',alignItems:'center',justifyContent:'center'}}>
                        {!c&&<span style={{fontSize:8,fontWeight:700,color:'white',textShadow:'0 0 3px rgba(0,0,0,0.8)'}}>A</span>}
                      </button>
                    ))}
                    <input type="color" value={colorT||'#6b7280'} onChange={e=>{setColorT(e.target.value);sched(content,name,color,template)}}
                           style={{width:22,height:22,borderRadius:5,border:'1px solid rgba(255,255,255,0.15)',cursor:'pointer',padding:0,background:'none'}}/>
                  </div>
                  {colorT&&<button onClick={()=>{setColorT('');sched(content,name,color,template)}} style={{fontSize:9,color:'#4b4b6b',background:'none',border:'none',cursor:'pointer',padding:0}}>↩ Auto</button>}
                </div>
                <div>
                  <p style={S}>Tipo de letra</p>
                  <div style={{position:'relative'}}>
                    <button onClick={()=>setFontOpen(!fontOpen)} style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 10px',borderRadius:8,cursor:'pointer',background:'rgba(255,255,255,0.04)',border:`1.5px solid ${fontOpen?'rgba(99,102,241,0.45)':'rgba(255,255,255,0.08)'}`,fontFamily:'Inter,sans-serif'}}>
                      <span style={{fontSize:12,color:'#e2e8f0',fontFamily:font.family}}>{font.label}</span>
                      <span style={{color:'#4b4b6b',fontSize:10}}>{fontOpen?'▲':'▼'}</span>
                    </button>
                    {fontOpen&&(
                      <div style={{position:'absolute',top:'100%',left:0,right:0,zIndex:50,background:'#1a1a2e',border:'1px solid rgba(255,255,255,0.1)',borderRadius:10,marginTop:4,maxHeight:260,overflowY:'auto',boxShadow:'0 8px 32px rgba(0,0,0,0.5)'}}>
                        {FONTS.map(f=>(
                          <button key={f.id} onClick={()=>{setFontId(f.id);setFontOpen(false);setSaveState('unsaved')}} style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'9px 12px',border:'none',cursor:'pointer',textAlign:'left',background:fontId===f.id?'rgba(99,102,241,0.15)':'transparent',borderBottom:'1px solid rgba(255,255,255,0.04)',fontFamily:'Inter,sans-serif'}}>
                            <div><p style={{fontSize:13,fontFamily:f.family,color:'#e2e8f0',marginBottom:1}}>{f.label}</p><p style={{fontSize:10,fontFamily:f.family,color:'#4b4b6b'}}>Aa Bb 123</p></div>
                            {fontId===f.id&&<span style={{color:'#a5b4fc',fontSize:12}}>✓</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {/* ── Animaciones ── */}
                <div>
                  <p style={S}>⚡ Animaciones</p>
                  <div style={{display:'flex',flexDirection:'column',gap:6}}>
                    {([
                      {key:'animAurora',      label:'Aurora en hero',              icon:'🌅'},
                      {key:'animTypewriter',  label:'Typewriter en subtítulo',      icon:'⌨️'},
                      {key:'animTerminal',    label:'Terminal en título (Neon)',    icon:'💻'},
                      {key:'animBorderBeam',  label:'Border Beam en botón',         icon:'✨'},
                      {key:'animScrollReveal',label:'Scroll reveal en secciones',   icon:'🎞️'},
                      {key:'animNumber',      label:'Contador animado en precios',  icon:'🔢'},
                    ] as {key: 'animAurora'|'animTypewriter'|'animTerminal'|'animBorderBeam'|'animScrollReveal'|'animNumber'; label: string; icon: string}[]).map(anim=>{
                      const val = content.theme?.[anim.key] ?? true
                      return (
                        <button key={anim.key} onClick={()=>{
                          const nc={...content,theme:{...content.theme,[anim.key]:!val}}
                          setContent(nc);sched(nc,name,color,template)
                        }} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'7px 10px',borderRadius:8,border:`1.5px solid ${val?'rgba(99,102,241,0.35)':'rgba(255,255,255,0.06)'}`,background:val?'rgba(99,102,241,0.08)':'rgba(255,255,255,0.02)',cursor:'pointer',fontFamily:'Inter,sans-serif'}}>
                          <span style={{fontSize:10,color:val?'#c4b5fd':'#4b4b6b',fontWeight:500}}>{anim.icon} {anim.label}</span>
                          <span style={{fontSize:11,fontWeight:700,color:val?'#a5b4fc':'#4b4b6b'}}>{val?'ON':'OFF'}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div>
                  <input ref={logoRef} type="file" accept="image/*" style={{display:'none'}} onChange={async e=>{const f=e.target.files?.[0];if(!f)return;const u=await upload(f,'logo');if(u){setLogo(u);sched(content,name,color,template)}}}/>
                  <input ref={coverRef} type="file" accept="image/*" style={{display:'none'}} onChange={async e=>{const f=e.target.files?.[0];if(!f)return;const u=await upload(f,'cover');if(u){setCover(u);sched(content,name,color,template)}}}/>
                  <input ref={galleryRef} type="file" accept="image/*" multiple style={{display:'none'}} onChange={async e=>{const files=Array.from(e.target.files??[]);const urls=(await Promise.all(files.map(f=>upload(f,'gallery')))).filter(Boolean) as string[];const next=[...gallery,...urls].slice(0,12);setGallery(next);const nc={...content,gallery:next};setContent(nc);sched(nc,name,color,template)}}/>
                  <div style={{display:'flex',flexDirection:'column',gap:10}}>
                    {/* Logo */}
                    <div>
                      <p style={S}>Logo</p>
                      <div style={{display:'flex',gap:4}}>
                        <button onClick={()=>logoRef.current?.click()} style={{display:'flex',alignItems:'center',gap:8,padding:'7px 10px',borderRadius:8,border:`1.5px dashed ${logo?'rgba(99,102,241,0.5)':'rgba(255,255,255,0.1)'}`,background:'rgba(255,255,255,0.02)',cursor:'pointer',fontFamily:'Inter,sans-serif',flex:1}}>
                          {logo?<img src={logo} alt="" style={{width:22,height:22,objectFit:'contain',borderRadius:4}}/>:<span style={{fontSize:14}}>🏷</span>}
                          <span style={{fontSize:10,color:logo?'#a5b4fc':'#4b4b6b',fontWeight:500}}>{logo?'Cambiar logo':'Subir logo'}</span>
                        </button>
                        {logo&&<button onClick={()=>{setLogo(null);sched(content,name,color,template)}} style={{padding:'7px 9px',borderRadius:8,border:'1.5px solid rgba(239,68,68,0.3)',background:'rgba(239,68,68,0.06)',cursor:'pointer',color:'#f87171',fontSize:13,lineHeight:1}} title="Eliminar logo">✕</button>}
                      </div>
                      {logo&&(
                        <div style={{marginTop:8}}>
                          <div style={{display:'flex',gap:4,marginBottom:6}}>
                            {LOGO_SIZES.map(s=>(
                              <button key={s.id} onClick={()=>setThemeField('logoSize',s.id)} style={{flex:1,padding:'4px 2px',borderRadius:6,border:`1.5px solid ${(content.theme?.logoSize??'md')===s.id?'rgba(99,102,241,0.6)':'rgba(255,255,255,0.08)'}`,background:(content.theme?.logoSize??'md')===s.id?'rgba(99,102,241,0.12)':'rgba(255,255,255,0.03)',cursor:'pointer',color:(content.theme?.logoSize??'md')===s.id?'#a5b4fc':'#4b4b6b',fontSize:10,fontWeight:700,fontFamily:'Inter,sans-serif'}}>{s.label}</button>
                            ))}
                          </div>
                          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:4}}>
                            {LOGO_SHAPES.map(s=>{
                              const active=(content.theme?.logoShape??'default')===s.id
                              const sz=20
                              const preview: React.CSSProperties=s.id==='circle'?{borderRadius:'50%',width:sz,height:sz,background:'rgba(99,102,241,0.4)',margin:'0 auto 3px'}:s.id==='rounded'?{borderRadius:6,width:sz*2,height:sz,background:'rgba(99,102,241,0.4)',margin:'0 auto 3px'}:s.id==='square'?{borderRadius:0,width:sz,height:sz,background:'rgba(99,102,241,0.4)',margin:'0 auto 3px'}:{borderRadius:4,width:sz*2.5,height:sz*0.7,background:'rgba(99,102,241,0.4)',margin:'0 auto 3px'}
                              return(
                                <button key={s.id} onClick={()=>setThemeField('logoShape',s.id)} style={{padding:'6px 4px',borderRadius:6,border:`1.5px solid ${active?'rgba(99,102,241,0.6)':'rgba(255,255,255,0.08)'}`,background:active?'rgba(99,102,241,0.12)':'rgba(255,255,255,0.03)',cursor:'pointer',fontFamily:'Inter,sans-serif'}}>
                                  <div style={preview}/>
                                  <p style={{fontSize:9,color:active?'#a5b4fc':'#4b4b6b',textAlign:'center',margin:0}}>{s.label}</p>
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                    {/* Portada */}
                    <div>
                      <p style={S}>Portada</p>
                      <div style={{display:'flex',gap:4}}>
                        <button onClick={()=>coverRef.current?.click()} style={{display:'flex',alignItems:'center',gap:8,padding:'7px 10px',borderRadius:8,border:`1.5px dashed ${cover?'rgba(99,102,241,0.5)':'rgba(255,255,255,0.1)'}`,background:'rgba(255,255,255,0.02)',cursor:'pointer',fontFamily:'Inter,sans-serif',flex:1}}>
                          {cover?<img src={cover} alt="" style={{width:22,height:22,objectFit:'cover',borderRadius:4}}/>:<span style={{fontSize:14}}>🖼</span>}
                          <span style={{fontSize:10,color:cover?'#a5b4fc':'#4b4b6b',fontWeight:500}}>{cover?'Cambiar portada':'Subir portada'}</span>
                        </button>
                        {cover&&<button onClick={()=>{setCover(null);sched(content,name,color,template)}} style={{padding:'7px 9px',borderRadius:8,border:'1.5px solid rgba(239,68,68,0.3)',background:'rgba(239,68,68,0.06)',cursor:'pointer',color:'#f87171',fontSize:13,lineHeight:1}} title="Eliminar portada">✕</button>}
                      </div>
                    </div>
                    {/* Galería */}
                    <div>
                      <p style={S}>Galería</p>
                      <button onClick={()=>galleryRef.current?.click()} style={{display:'flex',alignItems:'center',gap:8,padding:'7px 10px',borderRadius:8,border:`1.5px dashed ${gallery.length>0?'rgba(99,102,241,0.5)':'rgba(255,255,255,0.1)'}`,background:'rgba(255,255,255,0.02)',cursor:'pointer',fontFamily:'Inter,sans-serif',width:'100%'}}>
                        <span style={{fontSize:14}}>📸</span>
                        <span style={{fontSize:10,color:gallery.length>0?'#a5b4fc':'#4b4b6b',fontWeight:500}}>{gallery.length>0?`${gallery.length} foto${gallery.length>1?'s':''} · Agregar más`:'Agregar fotos'}</span>
                      </button>
                      {gallery.length>0&&(
                        <>
                        <div style={{marginTop:8,display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:4}}>
                          {GALLERY_FRAMES.map(f=>{
                            const active=(content.theme?.galleryFrame??'rounded')===f.id
                            const previewStyle: React.CSSProperties=f.id==='circle'?{borderRadius:'50%',width:28,height:28,background:'rgba(99,102,241,0.35)',margin:'0 auto 3px'}:f.id==='square'?{borderRadius:0,width:28,height:28,background:'rgba(99,102,241,0.35)',margin:'0 auto 3px'}:f.id==='shadow'?{borderRadius:8,width:28,height:28,background:'rgba(99,102,241,0.35)',boxShadow:'0 6px 14px rgba(0,0,0,0.55)',margin:'0 auto 3px'}:f.id==='border'?{borderRadius:6,width:28,height:28,background:'rgba(99,102,241,0.2)',outline:`2px solid ${color}`,outlineOffset:1,margin:'0 auto 3px'}:f.id==='polaroid'?{borderRadius:2,width:24,height:28,background:'white',padding:'2px 2px 8px',boxShadow:'0 2px 8px rgba(0,0,0,0.4)',margin:'0 auto 3px'}:{borderRadius:8,width:28,height:28,background:'rgba(99,102,241,0.35)',margin:'0 auto 3px'}
                            return(
                              <button key={f.id} onClick={()=>setThemeField('galleryFrame',f.id)} style={{padding:'6px 2px',borderRadius:6,border:`1.5px solid ${active?'rgba(99,102,241,0.6)':'rgba(255,255,255,0.08)'}`,background:active?'rgba(99,102,241,0.12)':'rgba(255,255,255,0.03)',cursor:'pointer',fontFamily:'Inter,sans-serif'}}>
                                <div style={previewStyle}/>
                                <p style={{fontSize:9,color:active?'#a5b4fc':'#4b4b6b',textAlign:'center',margin:0}}>{f.label}</p>
                              </button>
                            )
                          })}
                        </div>
                        {/* Thumbnails con botón eliminar */}
                        <div style={{marginTop:10,display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:4}}>
                          {gallery.map((url,i)=>(
                            <div key={i} style={{position:'relative',aspectRatio:'1',borderRadius:6,overflow:'hidden',background:'rgba(255,255,255,0.04)'}}>
                              <img src={url} alt="" style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}/>
                              <button
                                onClick={()=>{
                                  const next=gallery.filter((_,idx)=>idx!==i)
                                  setGallery(next)
                                  const nc={...content,gallery:next}
                                  setContent(nc)
                                  sched(nc,name,color,template)
                                }}
                                style={{position:'absolute',top:3,right:3,width:18,height:18,borderRadius:'50%',border:'none',background:'rgba(0,0,0,0.7)',color:'white',fontSize:9,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',lineHeight:1,padding:0,fontFamily:'Inter,sans-serif'}}
                              >✕</button>
                            </div>
                          ))}
                        </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            )}

            {panel==='secciones'&&(
              <div style={{display:'flex',flexDirection:'column',gap:12}}>

                {/* Secciones visibles */}
                <div style={{display:'flex',flexDirection:'column',gap:4}}>
                  <p style={S}>Secciones visibles</p>
                  {SECTIONS_LIST.map(s=>(
                    <div key={s.key} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 10px',borderRadius:8,background:'rgba(255,255,255,0.03)'}}>
                      <span style={{fontSize:11,color:'#8b8bab'}}>{s.label}</span>
                      <div onClick={()=>{setSections(prev=>({...prev,[s.key]:!prev[s.key as keyof typeof prev]}));setSaveState('unsaved')}} style={{width:32,height:18,borderRadius:9,position:'relative',cursor:'pointer',background:sections[s.key as keyof typeof sections]?color:'rgba(255,255,255,0.1)',transition:'background 0.2s'}}>
                        <div style={{width:14,height:14,background:'white',borderRadius:7,position:'absolute',top:2,transition:'left 0.2s',left:sections[s.key as keyof typeof sections]?15:2}}/>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Menú de navegación */}
                <div style={{borderTop:'1px solid rgba(255,255,255,0.06)',paddingTop:10}}>
                  <p style={S}>Menú superior</p>
                  <p style={{fontSize:9,color:'#3d3d5c',marginBottom:8}}>Edita el nombre de cada link o desactívalo</p>
                  {(() => {
                    const defaultNav = [
                      {label:'Inicio',    anchor:'inicio',    visible:true},
                      {label:'Servicios', anchor:'servicios', visible:true},
                      {label:'Productos', anchor:'productos', visible:true},
                      {label:'Galería',   anchor:'galeria',   visible:true},
                      {label:'Contacto',  anchor:'contacto',  visible:true},
                    ]
                    const nav = content.nav ?? defaultNav
                    const updateNav = (idx: number, field: 'label'|'visible', val: string|boolean) => {
                      const next = nav.map((l,i) => i===idx ? {...l,[field]:val} : l)
                      const nc = {...content, nav: next}
                      setContent(nc); sched(nc,name,color,template)
                    }
                    const moveNav = (idx: number, dir: -1|1) => {
                      const next = [...nav]
                      const swap = idx+dir
                      if (swap<0||swap>=next.length) return
                      ;[next[idx],next[swap]]=[next[swap],next[idx]]
                      const nc = {...content, nav: next}
                      setContent(nc); sched(nc,name,color,template)
                    }
                    return nav.map((l,i) => (
                      <div key={l.anchor} style={{display:'flex',alignItems:'center',gap:4,marginBottom:5}}>
                        {/* Flechas orden */}
                        <div style={{display:'flex',flexDirection:'column',gap:1}}>
                          <button onClick={()=>moveNav(i,-1)} style={{background:'none',border:'none',cursor:'pointer',color:'#3d3d5c',fontSize:8,padding:'1px 3px',lineHeight:1}}>▲</button>
                          <button onClick={()=>moveNav(i, 1)} style={{background:'none',border:'none',cursor:'pointer',color:'#3d3d5c',fontSize:8,padding:'1px 3px',lineHeight:1}}>▼</button>
                        </div>
                        {/* Label editable */}
                        <input
                          value={l.label}
                          onChange={e=>updateNav(i,'label',e.target.value)}
                          style={{flex:1,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:6,color:'#e2e8f0',fontSize:11,padding:'5px 7px',outline:'none',fontFamily:'Inter,sans-serif'}}
                        />
                        {/* Toggle visible */}
                        <div onClick={()=>updateNav(i,'visible',!l.visible)} style={{width:28,height:16,borderRadius:8,position:'relative',cursor:'pointer',flexShrink:0,background:l.visible?color:'rgba(255,255,255,0.1)',transition:'background 0.2s'}}>
                          <div style={{width:12,height:12,background:'white',borderRadius:6,position:'absolute',top:2,transition:'left 0.2s',left:l.visible?14:2}}/>
                        </div>
                      </div>
                    ))
                  })()}
                </div>

              </div>
            )}

            {panel==='acciones'&&(
              <div style={{display:'flex',flexDirection:'column',gap:10}}>

                {/* ── Datos de contacto ── */}
                <p style={S}>Datos de contacto</p>
                {([
                  {key:'contact.phone',     label:'Teléfono',   placeholder:'+56 9 1234 5678', icon:'📞'},
                  {key:'contact.whatsapp',  label:'WhatsApp',   placeholder:'+56912345678',     icon:'💬'},
                  {key:'contact.address',   label:'Dirección',  placeholder:'Calle 123, Ciudad',icon:'📍'},
                  {key:'contact.instagram', label:'Instagram',  placeholder:'@minegocio',       icon:'📸'},
                ] as {key:string;label:string;placeholder:string;icon:string}[]).map(f=>{
                  const keys = f.key.split('.') as ['contact', keyof typeof content.contact]
                  const val  = (content[keys[0]] as Record<string,string|undefined>)?.[keys[1]] ?? ''
                  return (
                    <div key={f.key}>
                      <p style={{...S,marginBottom:3}}>{f.icon} {f.label}</p>
                      <input
                        value={val}
                        onChange={e => edit(f.key, e.target.value)}
                        placeholder={f.placeholder}
                        style={{width:'100%',background:'rgba(255,255,255,0.04)',border:'1.5px solid rgba(255,255,255,0.08)',borderRadius:8,color:'#e2e8f0',fontSize:11,padding:'7px 10px',outline:'none',fontFamily:'Inter,sans-serif',boxSizing:'border-box'}}
                      />
                    </div>
                  )
                })}

                <div style={{borderTop:'1px solid rgba(255,255,255,0.06)',paddingTop:10,marginTop:2}}>
                  <p style={S}>Reseñas</p>
                </div>
                {(content.reviews??[]).map((r,i)=>(
                  <div key={i} style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:10,padding:10}}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
                      <input defaultValue={r.author} onBlur={e=>{const reviews=[...(content.reviews??[])];reviews[i]={...reviews[i],author:e.target.value};const next={...content,reviews};setContent(next);sched(next,name,color,template)}} style={{background:'transparent',border:'none',outline:'none',color:'#e2e8f0',fontSize:11,fontWeight:600,fontFamily:'Inter,sans-serif',flex:1}}/>
                      <button onClick={()=>{const next={...content,reviews:(content.reviews??[]).filter((_,idx)=>idx!==i)};setContent(next);sched(next,name,color,template)}} style={{fontSize:10,color:'#3d3d5c',background:'none',border:'none',cursor:'pointer'}}>✕</button>
                    </div>
                    <div style={{display:'flex',gap:2,marginBottom:6}}>
                      {[1,2,3,4,5].map(star=><button key={star} onClick={()=>{const reviews=[...(content.reviews??[])];reviews[i]={...reviews[i],rating:star};const next={...content,reviews};setContent(next);sched(next,name,color,template)}} style={{fontSize:13,background:'none',border:'none',cursor:'pointer',color:star<=r.rating?'#f59e0b':'#3d3d5c'}}>★</button>)}
                    </div>
                    <textarea defaultValue={r.text} rows={2} onBlur={e=>{const reviews=[...(content.reviews??[])];reviews[i]={...reviews[i],text:e.target.value};const next={...content,reviews};setContent(next);sched(next,name,color,template)}} style={{width:'100%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:6,color:'#8b8bab',fontSize:10,padding:'5px 7px',resize:'none',outline:'none',fontFamily:'Inter,sans-serif'}}/>
                  </div>
                ))}
                <button onClick={()=>{const next={...content,reviews:[...(content.reviews??[]),{author:'Nombre',rating:5,text:'Excelente servicio.'}]};setContent(next);sched(next,name,color,template)}} style={{padding:7,borderRadius:8,border:'1px dashed rgba(99,102,241,0.3)',background:'rgba(99,102,241,0.06)',color:'#a5b4fc',fontSize:10,fontWeight:600,cursor:'pointer',fontFamily:'Inter,sans-serif'}}>+ Agregar reseña</button>

                {/* ── Agregar secciones vacías ── */}
                <div style={{borderTop:'1px solid rgba(255,255,255,0.06)',paddingTop:10,marginTop:8}}>
                  <p style={{fontSize:10,fontWeight:700,color:'#8b8bab',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6}}>Agregar secciones</p>
                  <div style={{display:'flex',flexDirection:'column',gap:4}}>
                    {!(content.faq??[]).length&&<button onClick={()=>{const next={...content,faq:[{q:'¿Cuánto tiempo tarda el servicio?',a:'Generalmente entre 30 y 60 minutos.'},{q:'¿Tienen garantía?',a:'Sí, todos nuestros servicios tienen garantía.'}]};setContent(next);sched(next,name,color,template)}} style={{padding:'6px 10px',borderRadius:7,border:'1px dashed rgba(99,102,241,0.3)',background:'rgba(99,102,241,0.06)',color:'#a5b4fc',fontSize:10,fontWeight:600,cursor:'pointer',textAlign:'left',fontFamily:'Inter,sans-serif'}}>❓ Agregar FAQ</button>}
                    {!(content.pricing??[]).length&&<button onClick={()=>{const next={...content,pricing:[{title:'Básico',price:'',desc:'Ideal para comenzar.',highlighted:false},{title:'Pro',price:'',desc:'Nuestro plan más popular.',highlighted:true}]};setContent(next);sched(next,name,color,template)}} style={{padding:'6px 10px',borderRadius:7,border:'1px dashed rgba(99,102,241,0.3)',background:'rgba(99,102,241,0.06)',color:'#a5b4fc',fontSize:10,fontWeight:600,cursor:'pointer',textAlign:'left',fontFamily:'Inter,sans-serif'}}>💲 Agregar sección de precios</button>}
                    {!(content.steps??[]).length&&<button onClick={()=>{const next={...content,steps:[{title:'Contacta',desc:'Escríbenos o llama.'},{title:'Agenda',desc:'Elige día y hora.'},{title:'Confirmación',desc:'Te avisamos al instante.'},{title:'Listo',desc:'Disfruta el servicio.'}]};setContent(next);sched(next,name,color,template)}} style={{padding:'6px 10px',borderRadius:7,border:'1px dashed rgba(99,102,241,0.3)',background:'rgba(99,102,241,0.06)',color:'#a5b4fc',fontSize:10,fontWeight:600,cursor:'pointer',textAlign:'left',fontFamily:'Inter,sans-serif'}}>🔢 Agregar proceso (pasos)</button>}
                    {!(content.benefits??[]).length&&<button onClick={()=>{const next={...content,benefits:[{icon:'⚡',title:'Rápido',desc:'Atención inmediata.'},{icon:'🏆',title:'Calidad',desc:'Años de experiencia.'},{icon:'💬',title:'Soporte 24/7',desc:'Siempre disponibles.'}]};setContent(next);sched(next,name,color,template)}} style={{padding:'6px 10px',borderRadius:7,border:'1px dashed rgba(99,102,241,0.3)',background:'rgba(99,102,241,0.06)',color:'#a5b4fc',fontSize:10,fontWeight:600,cursor:'pointer',textAlign:'left',fontFamily:'Inter,sans-serif'}}>✅ Agregar beneficios</button>}
                  </div>
                </div>

                <div style={{marginTop:8,borderTop:'1px solid rgba(255,255,255,0.06)',paddingTop:10,display:'flex',flexDirection:'column',gap:4}}>
                  <a href="/dashboard/sitio" style={{display:'block',padding:'7px 10px',borderRadius:7,border:'1px solid rgba(255,255,255,0.06)',background:'rgba(255,255,255,0.03)',color:'#8b8bab',fontSize:10,textDecoration:'none'}}>🔄 Regenerar con IA</a>
                  <button onClick={()=>save(content,name,color,template)} style={{padding:'7px 10px',borderRadius:7,border:'1px solid rgba(255,255,255,0.06)',background:'rgba(255,255,255,0.03)',color:'#8b8bab',fontSize:10,cursor:'pointer',textAlign:'left',fontFamily:'Inter,sans-serif'}}>💾 Guardar ahora</button>
                </div>
              </div>
            )}
          </div>
        </div>

        )}

        {/* PREVIEW */}
        <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',background:'#1a1a2e'}} onClick={()=>fontOpen&&setFontOpen(false)}>
          <div style={{padding:'6px 16px',background:'rgba(99,102,241,0.08)',borderBottom:'1px solid rgba(99,102,241,0.15)',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
            <span style={{fontSize:11,color:'rgba(165,180,252,0.7)'}}>{mode==='preview'?'👁 Vista previa real · Así se verá tu sitio publicado, incluyendo los cambios que aún no has guardado':'✏ Modo edición · Haz clic en un texto para editarlo. El diseño final puede variar: usa «Vista previa real» para ver tu sitio tal como se publicará'}</span>
          </div>
          <div style={{flex:1,overflowY:'auto',padding:20,display:'flex',justifyContent:'center',alignItems:'flex-start'}}>
            <div style={{width:viewport==='movil'?390:'100%',maxWidth:viewport==='movil'?390:(mode==='preview'?1280:960),borderRadius:12,overflow:'hidden',boxShadow:'0 20px 60px rgba(0,0,0,0.6)',transition:'width 0.3s',fontFamily:font.family}}>

              {/* SITIO */}
              {mode==='preview'&&(
                <iframe title="Vista previa real" srcDoc={srcDoc} sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                  style={{width:'100%',height:'calc(100vh - 118px)',border:'none',display:'block',background:'#fff'}}/>
              )}
              <div style={{background:pageBg,minHeight:'100vh',color:navFg,display:mode==='preview'?'none':'block'}}>

                {/* NAV */}
                <nav style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:mini?'1.25rem 3rem':'1rem 2rem',background:mini?'transparent':navBg,borderBottom:mini?'none':`1px solid ${brd}`,backdropFilter:(dark||vib)?'blur(12px)':'none',position:'sticky',top:0,zIndex:10}}>
                  {logo ? (() => {
                    const lSz = LOGO_SIZE_MAP[content.theme?.logoSize??'md']
                    const lSh = content.theme?.logoShape??'default'
                    const needsBg = dark||vib
                    return (
                      <div style={{display:'inline-flex',alignItems:'center',padding:needsBg?'5px 8px':0,background:needsBg?'rgba(255,255,255,0.14)':'transparent',borderRadius:needsBg?10:0,backdropFilter:needsBg?'blur(4px)':'none'}}>
                        <img src={logo} alt={name} style={logoImgStyle(lSh,lSz)}/>
                      </div>
                    )
                  })()
                    :<span contentEditable suppressContentEditableWarning style={{...eBase,fontWeight:mini?400:800,fontSize:mini?'0.75rem':'1.125rem',color:navFg,textTransform:mini?'uppercase':'none',letterSpacing:mini?'0.15em':'normal'}} onFocus={onFocusEdit} onBlur={e=>{clearEdit(e.currentTarget);editName(e.currentTarget.innerText.trim())}} onMouseEnter={onHoverEdit} onMouseLeave={onLeaveHover}>{name}</span>}
                  <span contentEditable suppressContentEditableWarning style={{...eBase,background:mini?'transparent':color,color:mini?muted:'white',padding:mini?'0':'0.5rem 1.25rem',borderRadius:8,fontSize:'0.875rem',fontWeight:700,display:'inline-block'}} onFocus={onFocusEdit} onBlur={e=>{clearEdit(e.currentTarget);e.currentTarget.style.background=mini?'transparent':color;e.currentTarget.style.color=mini?muted:'white';edit('contact.cta',e.currentTarget.innerText.trim())}} onMouseEnter={onHoverEdit} onMouseLeave={onLeaveHover}>{content.contact?.cta??'Contactar'}</span>
                </nav>

                {/* HERO */}
                {sections.hero&&(
                  <div style={{background:heroBg,padding:mini?'5rem 3rem':'5rem 2rem',position:'relative',overflow:'hidden'}}>
                    {!hasCover&&!dark&&!vib&&!mini&&<div style={{position:'absolute',inset:0,opacity:0.18,pointerEvents:'none',backgroundImage:`radial-gradient(${color}70 1px,transparent 1px)`,backgroundSize:'24px 24px'}}/>}
                    <div style={{position:'relative',maxWidth:mini?'640px':'720px',margin:mini?'0':'0 auto',textAlign:mini?'left':'center'}}>
                      {logo&&!mini&&(()=>{
                        const lSz=LOGO_SIZE_MAP[content.theme?.logoSize??'md']*1.3
                        const lSh=content.theme?.logoShape??'default'
                        return <div style={{display:'flex',justifyContent:'center',marginBottom:'1.5rem'}}><img src={logo} alt={name} style={logoImgStyle(lSh,Math.round(lSz))}/></div>
                      })()}
                      {!mini&&<div style={{display:'inline-block',marginBottom:'1.25rem',background:over?'rgba(255,255,255,0.15)':`${color}18`,border:`1px solid ${over?'rgba(255,255,255,0.3)':color+'30'}`,padding:'3px 14px',borderRadius:20}}>
                        <span contentEditable suppressContentEditableWarning style={{...eBase,fontSize:11,fontWeight:700,color:over?'rgba(255,255,255,0.9)':color}} onFocus={onFocusEdit} onBlur={e=>{clearEdit(e.currentTarget);editName(e.currentTarget.innerText.trim())}} onMouseEnter={onHoverEdit} onMouseLeave={onLeaveHover}>{name}</span>
                      </div>}
                      <h1 contentEditable suppressContentEditableWarning style={{...eBase,fontSize:mini?'clamp(2.5rem,5vw,4rem)':'clamp(1.75rem,4vw,2.75rem)',fontWeight:mini?900:800,color:heroFg,lineHeight:1.12,marginBottom:'1rem',letterSpacing:mini?'-0.02em':'normal',display:'block',fontFamily:eleg?'Georgia,serif':'inherit'}} onFocus={onFocusEdit} onBlur={e=>{clearEdit(e.currentTarget);edit('hero.title',e.currentTarget.innerText.trim())}} onMouseEnter={onHoverEdit} onMouseLeave={onLeaveHover}>{content.hero.title}</h1>
                      {mini&&<div style={{width:48,height:4,background:color,borderRadius:2,marginBottom:'1.25rem'}}/>}
                      <p contentEditable suppressContentEditableWarning style={{...eBase,fontSize:mini?'1.125rem':'1.0625rem',color:over?'rgba(255,255,255,0.82)':muted,marginBottom:'2rem',lineHeight:1.75,maxWidth:mini?'500px':'none',display:'block'}} onFocus={onFocusEdit} onBlur={e=>{clearEdit(e.currentTarget);edit('hero.subtitle',e.currentTarget.innerText.trim())}} onMouseEnter={onHoverEdit} onMouseLeave={onLeaveHover}>{content.hero.subtitle}</p>
                      <span contentEditable suppressContentEditableWarning style={{...eBase,display:'inline-block',background:ctaBg,color:ctaFg,padding:'0.875rem 2.25rem',borderRadius:10,fontWeight:700,fontSize:'1rem',boxShadow:`0 6px 24px ${color}40`}} onFocus={onFocusEdit} onBlur={e=>{clearEdit(e.currentTarget);e.currentTarget.style.background=ctaBg;e.currentTarget.style.color=ctaFg;edit('hero.cta',e.currentTarget.innerText.trim())}} onMouseEnter={onHoverEdit} onMouseLeave={onLeaveHover}>{content.hero.cta}</span>
                      {mini&&<span style={{fontSize:'0.875rem',color:muted,marginLeft:'1rem'}}>Sin compromiso</span>}
                    </div>
                  </div>
                )}

                {/* NOSOTROS */}
                {sections.nosotros&&(
                  <div style={{padding:mini?'4rem 3rem':'4.5rem 2rem',textAlign:mini?'left':'center',background:dark?'#0d0d14':vib?'rgba(0,0,0,0.12)':'white'}}>
                    {!mini&&!dark&&<div style={{width:44,height:3,background:color,borderRadius:2,margin:'0 auto 1.25rem'}}/>}
                    {mini&&<p style={{fontSize:'0.75rem',fontWeight:800,color:muted,letterSpacing:'0.15em',textTransform:'uppercase',marginBottom:'0.75rem'}}>Quiénes somos</p>}
                    <p contentEditable suppressContentEditableWarning style={{...eBase,color:muted,lineHeight:1.85,fontSize:'1rem',maxWidth:'650px',margin:mini?'0':'0 auto',display:'block'}} onFocus={onFocusEdit} onBlur={e=>{clearEdit(e.currentTarget);edit('about.text',e.currentTarget.innerText.trim())}} onMouseEnter={onHoverEdit} onMouseLeave={onLeaveHover}>{content.about.text}</p>
                  </div>
                )}

                {/* SERVICIOS */}
                {sections.servicios&&(
                  <div style={{padding:mini?'3rem 3rem':'3.5rem 2rem',background:mini?'#f9fafb':sectBg}}>
                    {mini?(
                      <div style={{maxWidth:'700px'}}>
                        <p style={{fontSize:'0.75rem',fontWeight:700,color:muted,letterSpacing:'0.15em',textTransform:'uppercase',marginBottom:'1.5rem'}}>Lo que hacemos</p>
                        {(content.services as Service[]).map((s,i)=>(
                          <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',padding:'1.25rem 0',borderBottom:`1px solid ${brd}`}}>
                            <div style={{flex:1}}><p style={{fontWeight:700,color:'#111827',marginBottom:'0.25rem'}}>{s.name}</p><p style={{color:muted,fontSize:'0.875rem'}}>{s.description}</p></div>
                            {s.price&&<span style={{color,fontWeight:700,marginLeft:'1.5rem',flexShrink:0}}>{s.price}</span>}
                          </div>
                        ))}
                        <button onClick={addSvc} style={{marginTop:'1rem',padding:'0.75rem 1.25rem',borderRadius:8,border:`2px dashed ${color}40`,background:'transparent',color,fontSize:'0.875rem',fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>+ Agregar servicio</button>
                      </div>
                    ):(
                      <>
                        <h2 contentEditable suppressContentEditableWarning style={{...eBase,fontSize:'1.5rem',fontWeight:800,textAlign:'center',marginBottom:'0.5rem',color:navFg}} onFocus={onFocusEdit} onBlur={e=>{clearEdit(e.currentTarget);editTitle('services',e.currentTarget.innerText.trim()||'Servicios')}} onMouseEnter={onHoverEdit} onMouseLeave={onLeaveHover}>{content.sectionTitles?.services??'Servicios'}</h2>
                        <p style={{textAlign:'center',fontSize:11,color:'rgba(165,180,252,0.6)',marginBottom:'1.5rem'}}>Clic en campo para editar · Clic en imagen para cambiarla</p>
                        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(210px,1fr))',gap:'1.25rem',maxWidth:'960px',margin:'0 auto'}}>
                          {/* ✅ ServiceCard como componente separado — sin hooks en map */}
                          {(content.services as Service[]).map((s,i)=>(
                            <ServiceCard key={i} s={s} i={i} color={color} dark={dark} vib={vib}
                              onChangeSvc={editSvc} onUploadImg={uploadSvcImg} onRemove={removeSvc} onToggleFeatured={toggleFeatured}/>
                          ))}
                          <button onClick={addSvc} style={{background:'transparent',border:`2px dashed ${dark?'rgba(99,102,241,0.3)':`${color}40`}`,borderRadius:12,padding:'2rem 1rem',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'0.5rem',minHeight:180,fontFamily:'inherit'}} onMouseEnter={e=>{e.currentTarget.style.background=`${color}10`;e.currentTarget.style.borderColor=color}} onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.borderColor=`${color}40`}}>
                            <div style={{width:40,height:40,borderRadius:'50%',background:`${color}20`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.5rem',color}}>+</div>
                            <span style={{fontSize:'0.8125rem',fontWeight:600,color}}>Agregar servicio</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* GALERÍA */}
                {sections.galeria&&gallery.length>0&&(
                  <div style={{padding:'3.5rem 2rem',background:dark?'rgba(255,255,255,0.02)':'white'}}>
                    <h2 contentEditable suppressContentEditableWarning style={{...eBase,fontSize:'1.5rem',fontWeight:800,textAlign:'center',marginBottom:'2rem',color:navFg}} onFocus={onFocusEdit} onBlur={e=>{clearEdit(e.currentTarget);editTitle('gallery',e.currentTarget.innerText.trim()||'Nuestros trabajos')}} onMouseEnter={onHoverEdit} onMouseLeave={onLeaveHover}>{content.sectionTitles?.gallery??'Nuestros trabajos'}</h2>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:'0.875rem',maxWidth:'960px',margin:'0 auto'}}>
                      {gallery.map((url,i)=>{
                        const frame=content.theme?.galleryFrame??'rounded'
                        return(
                          <div key={i} style={galleryFrameStyle(frame,color)}>
                            <img src={url} alt="" style={galleryImgStyle(frame)}/>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* RESEÑAS */}
                {sections.resenas&&content.reviews&&content.reviews.length>0&&(
                  <div style={{padding:'3.5rem 2rem',background:sectBg}}>
                    <h2 style={{fontSize:'1.5rem',fontWeight:800,textAlign:'center',marginBottom:'2rem',color:navFg}}>Lo que dicen nuestros clientes</h2>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:'1rem',maxWidth:'960px',margin:'0 auto'}}>
                      {content.reviews.map((r,i)=>(
                        <div key={i} style={{background:dark?'rgba(255,255,255,0.04)':'white',border:`1px solid ${brd}`,borderRadius:14,padding:'1.5rem'}}>
                          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:'0.875rem'}}>
                            <div style={{width:40,height:40,borderRadius:'50%',background:color,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:700,fontSize:'1rem'}}>{r.author?.[0]?.toUpperCase()}</div>
                            <div><p style={{fontWeight:700,color:navFg,fontSize:'0.9375rem'}}>{r.author}</p><p style={{color:'#f59e0b',fontSize:'0.875rem'}}>{'★'.repeat(r.rating??5)}</p></div>
                          </div>
                          <p style={{color:muted,fontSize:'0.875rem',lineHeight:1.7,fontStyle:'italic'}}>"{r.text}"</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* PRECIOS */}
                {sections.precios&&(content.pricing??[]).length>0&&(
                  <div style={{padding:'3.5rem 2rem',background:dark?'#0d0d14':'white'}}>
                    <h2 contentEditable suppressContentEditableWarning style={{...eBase,fontSize:'1.5rem',fontWeight:800,textAlign:'center',marginBottom:'2rem',color:navFg}} onFocus={onFocusEdit} onBlur={e=>{clearEdit(e.currentTarget);editTitle('pricing',e.currentTarget.innerText.trim()||'Precios')}} onMouseEnter={onHoverEdit} onMouseLeave={onLeaveHover}>{content.sectionTitles?.pricing??'Precios'}</h2>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:'1rem',maxWidth:'960px',margin:'0 auto'}}>
                      {(content.pricing??[]).map((p,i)=>(
                        <div key={i} style={{background:dark?'rgba(255,255,255,0.04)':p.highlighted?`${color}08`:'#f9fafb',border:`${p.highlighted?2:1}px solid ${p.highlighted?color:brd}`,borderRadius:14,padding:'1.75rem 1.5rem',textAlign:'center',position:'relative'}}>
                          {p.highlighted&&<span style={{position:'absolute',top:-11,left:'50%',transform:'translateX(-50%)',background:color,color:'white',fontSize:10,fontWeight:700,padding:'2px 10px',borderRadius:20,textTransform:'uppercase',whiteSpace:'nowrap'}}>Más popular</span>}
                          <button onClick={()=>{const next={...content,pricing:(content.pricing??[]).filter((_,idx)=>idx!==i)};setContent(next);sched(next,name,color,template)}} style={{position:'absolute',top:6,right:6,width:20,height:20,borderRadius:'50%',border:'none',background:'rgba(239,68,68,0.2)',color:'#fca5a5',fontSize:10,cursor:'pointer'}}>✕</button>
                          <div contentEditable suppressContentEditableWarning style={{...eBase,fontWeight:700,color:navFg,fontSize:'1rem',marginBottom:'0.5rem'}} onFocus={onFocusEdit} onBlur={e=>{clearEdit(e.currentTarget);const pr=[...(content.pricing??[])];pr[i]={...pr[i],title:e.currentTarget.innerText.trim()};const next={...content,pricing:pr};setContent(next);sched(next,name,color,template)}} onMouseEnter={onHoverEdit} onMouseLeave={onLeaveHover}>{p.title}</div>
                          {p.price&&<div contentEditable suppressContentEditableWarning style={{...eBase,fontSize:'1.75rem',fontWeight:800,color,marginBottom:'0.75rem',display:'block'}} onFocus={onFocusEdit} onBlur={e=>{clearEdit(e.currentTarget);const pr=[...(content.pricing??[])];pr[i]={...pr[i],price:e.currentTarget.innerText.trim()};const next={...content,pricing:pr};setContent(next);sched(next,name,color,template)}} onMouseEnter={onHoverEdit} onMouseLeave={onLeaveHover}>{p.price}</div>}
                          <div contentEditable suppressContentEditableWarning style={{...eBase,color:muted,fontSize:'0.875rem',lineHeight:1.6,marginBottom:'1rem',display:'block'}} onFocus={onFocusEdit} onBlur={e=>{clearEdit(e.currentTarget);const pr=[...(content.pricing??[])];pr[i]={...pr[i],desc:e.currentTarget.innerText.trim()};const next={...content,pricing:pr};setContent(next);sched(next,name,color,template)}} onMouseEnter={onHoverEdit} onMouseLeave={onLeaveHover}>{p.desc}</div>
                          <button onClick={()=>{const pr=[...(content.pricing??[])];pr[i]={...pr[i],highlighted:!pr[i].highlighted};const next={...content,pricing:pr};setContent(next);sched(next,name,color,template)}} style={{fontSize:10,padding:'4px 10px',borderRadius:6,border:`1px solid ${p.highlighted?color:'rgba(99,102,241,0.2)'}`,background:p.highlighted?`${color}18`:'transparent',color:p.highlighted?color:muted,cursor:'pointer',fontFamily:'inherit'}}>
                            {p.highlighted?'⭐ Destacado':'☆ Marcar como destacado'}
                          </button>
                        </div>
                      ))}
                      <button onClick={()=>{const next={...content,pricing:[...(content.pricing??[]),{title:'Plan Básico',price:'',desc:'Descripción del plan.',highlighted:false}]};setContent(next);sched(next,name,color,template)}} style={{background:'transparent',border:`2px dashed ${color}40`,borderRadius:12,padding:'2rem 1rem',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'0.5rem',minHeight:140,fontFamily:'inherit',color}} onMouseEnter={e=>{e.currentTarget.style.background=`${color}10`}} onMouseLeave={e=>{e.currentTarget.style.background='transparent'}}>
                        <span style={{fontSize:'1.5rem'}}>+</span>
                        <span style={{fontSize:'0.8125rem',fontWeight:600}}>Agregar plan</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* PROCESO */}
                {sections.pasos&&(content.steps??[]).length>0&&(
                  <div style={{padding:'3.5rem 2rem',background:sectBg}}>
                    <h2 contentEditable suppressContentEditableWarning style={{...eBase,fontSize:'1.5rem',fontWeight:800,textAlign:'center',marginBottom:'2rem',color:navFg}} onFocus={onFocusEdit} onBlur={e=>{clearEdit(e.currentTarget);editTitle('steps',e.currentTarget.innerText.trim()||'¿Cómo funciona?')}} onMouseEnter={onHoverEdit} onMouseLeave={onLeaveHover}>{content.sectionTitles?.steps??'¿Cómo funciona?'}</h2>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:'1.5rem',maxWidth:'860px',margin:'0 auto'}}>
                      {(content.steps??[]).map((s,i)=>(
                        <div key={i} style={{textAlign:'center',position:'relative'}}>
                          <button onClick={()=>{const next={...content,steps:(content.steps??[]).filter((_,idx)=>idx!==i)};setContent(next);sched(next,name,color,template)}} style={{position:'absolute',top:-8,right:-8,width:20,height:20,borderRadius:'50%',border:'none',background:'rgba(239,68,68,0.2)',color:'#fca5a5',fontSize:10,cursor:'pointer'}}>✕</button>
                          <div style={{width:48,height:48,borderRadius:'50%',background:`${color}22`,border:`2px solid ${color}55`,margin:'0 auto 1rem',display:'flex',alignItems:'center',justifyContent:'center'}}>
                            <span style={{fontSize:'1.25rem',fontWeight:800,color}}>{i+1}</span>
                          </div>
                          <div contentEditable suppressContentEditableWarning style={{...eBase,fontWeight:700,color:navFg,fontSize:'0.9375rem',marginBottom:'0.375rem',display:'block'}} onFocus={onFocusEdit} onBlur={e=>{clearEdit(e.currentTarget);const st=[...(content.steps??[])];st[i]={...st[i],title:e.currentTarget.innerText.trim()};const next={...content,steps:st};setContent(next);sched(next,name,color,template)}} onMouseEnter={onHoverEdit} onMouseLeave={onLeaveHover}>{s.title}</div>
                          <div contentEditable suppressContentEditableWarning style={{...eBase,color:muted,fontSize:'0.8125rem',lineHeight:1.6,display:'block'}} onFocus={onFocusEdit} onBlur={e=>{clearEdit(e.currentTarget);const st=[...(content.steps??[])];st[i]={...st[i],desc:e.currentTarget.innerText.trim()};const next={...content,steps:st};setContent(next);sched(next,name,color,template)}} onMouseEnter={onHoverEdit} onMouseLeave={onLeaveHover}>{s.desc}</div>
                        </div>
                      ))}
                      <div style={{textAlign:'center'}}>
                        <button onClick={()=>{const next={...content,steps:[...(content.steps??[]),{title:'Nuevo paso',desc:'Descripción del paso.'}]};setContent(next);sched(next,name,color,template)}} style={{background:'transparent',border:`2px dashed ${color}40`,borderRadius:12,padding:'1.5rem 1rem',cursor:'pointer',color,fontFamily:'inherit',fontWeight:600,fontSize:'0.8125rem',width:'100%'}}>+ Agregar paso</button>
                      </div>
                    </div>
                  </div>
                )}

                {/* BENEFICIOS */}
                {sections.beneficios&&(content.benefits??[]).length>0&&(
                  <div style={{padding:'3.5rem 2rem',background:dark?'rgba(255,255,255,0.02)':'#f9fafb'}}>
                    <h2 contentEditable suppressContentEditableWarning style={{...eBase,fontSize:'1.5rem',fontWeight:800,textAlign:'center',marginBottom:'2rem',color:navFg}} onFocus={onFocusEdit} onBlur={e=>{clearEdit(e.currentTarget);editTitle('benefits',e.currentTarget.innerText.trim()||'¿Por qué elegirnos?')}} onMouseEnter={onHoverEdit} onMouseLeave={onLeaveHover}>{content.sectionTitles?.benefits??'¿Por qué elegirnos?'}</h2>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(250px,1fr))',gap:'1.25rem',maxWidth:'960px',margin:'0 auto'}}>
                      {(content.benefits??[]).map((b,i)=>(
                        <div key={i} style={{background:dark?'rgba(255,255,255,0.04)':'white',border:`1px solid ${brd}`,borderRadius:14,padding:'1.5rem',display:'flex',gap:'1rem',position:'relative'}}>
                          <button onClick={()=>{const next={...content,benefits:(content.benefits??[]).filter((_,idx)=>idx!==i)};setContent(next);sched(next,name,color,template)}} style={{position:'absolute',top:6,right:6,width:20,height:20,borderRadius:'50%',border:'none',background:'rgba(239,68,68,0.2)',color:'#fca5a5',fontSize:10,cursor:'pointer'}}>✕</button>
                          <div contentEditable suppressContentEditableWarning style={{...eBase,fontSize:'2rem',flexShrink:0,display:'block'}} onFocus={onFocusEdit} onBlur={e=>{clearEdit(e.currentTarget);const bn=[...(content.benefits??[])];bn[i]={...bn[i],icon:e.currentTarget.innerText.trim()};const next={...content,benefits:bn};setContent(next);sched(next,name,color,template)}} onMouseEnter={onHoverEdit} onMouseLeave={onLeaveHover}>{b.icon}</div>
                          <div style={{flex:1}}>
                            <div contentEditable suppressContentEditableWarning style={{...eBase,fontWeight:700,color:navFg,fontSize:'1rem',marginBottom:'0.25rem',display:'block'}} onFocus={onFocusEdit} onBlur={e=>{clearEdit(e.currentTarget);const bn=[...(content.benefits??[])];bn[i]={...bn[i],title:e.currentTarget.innerText.trim()};const next={...content,benefits:bn};setContent(next);sched(next,name,color,template)}} onMouseEnter={onHoverEdit} onMouseLeave={onLeaveHover}>{b.title}</div>
                            <div contentEditable suppressContentEditableWarning style={{...eBase,color:muted,fontSize:'0.875rem',lineHeight:1.6,display:'block'}} onFocus={onFocusEdit} onBlur={e=>{clearEdit(e.currentTarget);const bn=[...(content.benefits??[])];bn[i]={...bn[i],desc:e.currentTarget.innerText.trim()};const next={...content,benefits:bn};setContent(next);sched(next,name,color,template)}} onMouseEnter={onHoverEdit} onMouseLeave={onLeaveHover}>{b.desc}</div>
                          </div>
                        </div>
                      ))}
                      <button onClick={()=>{const next={...content,benefits:[...(content.benefits??[]),{icon:'✨',title:'Nuevo beneficio',desc:'Descripción del beneficio.'}]};setContent(next);sched(next,name,color,template)}} style={{background:'transparent',border:`2px dashed ${color}40`,borderRadius:12,padding:'1.5rem',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:'0.5rem',color,fontFamily:'inherit',fontWeight:600,fontSize:'0.8125rem'}}>+ Agregar beneficio</button>
                    </div>
                  </div>
                )}

                {/* FAQ */}
                {sections.faq&&(content.faq??[]).length>0&&(
                  <div style={{padding:'3.5rem 2rem',background:sectBg}}>
                    <h2 contentEditable suppressContentEditableWarning style={{...eBase,fontSize:'1.5rem',fontWeight:800,textAlign:'center',marginBottom:'2rem',color:navFg}} onFocus={onFocusEdit} onBlur={e=>{clearEdit(e.currentTarget);editTitle('faq',e.currentTarget.innerText.trim()||'Preguntas frecuentes')}} onMouseEnter={onHoverEdit} onMouseLeave={onLeaveHover}>{content.sectionTitles?.faq??'Preguntas frecuentes'}</h2>
                    <div style={{maxWidth:'720px',margin:'0 auto',display:'flex',flexDirection:'column',gap:'0.625rem'}}>
                      {(content.faq??[]).map((item,i)=>(
                        <div key={i} style={{border:`1px solid ${brd}`,borderRadius:12,overflow:'hidden'}}>
                          <div style={{padding:'1rem 1.25rem',background:dark?'rgba(255,255,255,0.04)':'white',display:'flex',alignItems:'center',gap:8}}>
                            <div contentEditable suppressContentEditableWarning style={{...eBase,fontWeight:600,color:navFg,fontSize:'0.9375rem',flex:1}} onFocus={onFocusEdit} onBlur={e=>{clearEdit(e.currentTarget);const fa=[...(content.faq??[])];fa[i]={...fa[i],q:e.currentTarget.innerText.trim()};const next={...content,faq:fa};setContent(next);sched(next,name,color,template)}} onMouseEnter={onHoverEdit} onMouseLeave={onLeaveHover}>{item.q}</div>
                            <span style={{color,fontSize:'1.125rem',flexShrink:0}}>▾</span>
                            <button onClick={()=>{const next={...content,faq:(content.faq??[]).filter((_,idx)=>idx!==i)};setContent(next);sched(next,name,color,template)}} style={{width:20,height:20,borderRadius:'50%',border:'none',background:'rgba(239,68,68,0.2)',color:'#fca5a5',fontSize:10,cursor:'pointer',flexShrink:0}}>✕</button>
                          </div>
                          <div style={{padding:'0.75rem 1.25rem 1rem',background:dark?'rgba(255,255,255,0.02)':'#f9fafb'}}>
                            <div contentEditable suppressContentEditableWarning style={{...eBase,color:muted,fontSize:'0.9rem',lineHeight:1.7}} onFocus={onFocusEdit} onBlur={e=>{clearEdit(e.currentTarget);const fa=[...(content.faq??[])];fa[i]={...fa[i],a:e.currentTarget.innerText.trim()};const next={...content,faq:fa};setContent(next);sched(next,name,color,template)}} onMouseEnter={onHoverEdit} onMouseLeave={onLeaveHover}>{item.a}</div>
                          </div>
                        </div>
                      ))}
                      <button onClick={()=>{const next={...content,faq:[...(content.faq??[]),{q:'Nueva pregunta frecuente',a:'Respuesta a la pregunta.'}]};setContent(next);sched(next,name,color,template)}} style={{padding:'0.875rem',borderRadius:10,border:`2px dashed ${color}40`,background:'transparent',color,fontSize:'0.875rem',fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>+ Agregar pregunta</button>
                    </div>
                  </div>
                )}

                {/* FOOTER */}
                <div style={{background:dark?'#050508':'#111827',padding:'2.5rem 2rem',textAlign:'center'}}>
                  {logo&&<div style={{display:'flex',justifyContent:'center',marginBottom:'1rem'}}><img src={logo} alt="" style={{height:36,objectFit:'contain',filter:'brightness(0) invert(1)',opacity:0.75}}/></div>}
                  <span contentEditable suppressContentEditableWarning style={{...eBase,fontWeight:800,color:'white',display:'block',fontSize:'1.0625rem',marginBottom:'0.375rem'}} onFocus={onFocusEdit} onBlur={e=>{clearEdit(e.currentTarget);editName(e.currentTarget.innerText.trim())}} onMouseEnter={onHoverEdit} onMouseLeave={onLeaveHover}>{name}</span>
                  <p contentEditable suppressContentEditableWarning style={{...eBase,color:'#9ca3af',fontSize:'0.875rem',display:'block'}} onFocus={onFocusEdit} onBlur={e=>{clearEdit(e.currentTarget);edit('footer.tagline',e.currentTarget.innerText.trim())}} onMouseEnter={onHoverEdit} onMouseLeave={onLeaveHover}>{content.footer.tagline}</p>
                  <p style={{color:'#374151',fontSize:'0.75rem',marginTop:'1.25rem'}}>Sitio creado con <span style={{color}}>Amelia</span></p>
                </div>

              </div>
            </div>
          </div>
          <div style={{padding:'6px 16px',background:'#0f0f1a',borderTop:'1px solid rgba(255,255,255,0.06)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <span style={{fontSize:10,color:'#3d3d5c'}}>Estilo: <span style={{color:'#a5b4fc'}}>{TEMPLATES.find(t=>t.id===template)?.label}</span>{' · '}<span style={{color:'#a5b4fc',fontFamily:font.family}}>{font.label}</span></span>
            <span style={{fontSize:10,color:'#3d3d5c',fontFamily:'JetBrains Mono,monospace'}}>amelia.app/sitio/{businessSlug}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
