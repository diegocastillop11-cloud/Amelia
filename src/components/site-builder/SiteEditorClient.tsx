'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import type { SiteContent } from '@/types/database'

type TemplateId = 'moderna' | 'clasica' | 'dark' | 'vibrante' | 'elegante' | 'minimalista' | 'bold' | 'sunset' | 'glass'
interface Service { name: string; description: string; price: string; image?: string }

interface Props {
  businessId: string; businessName: string; businessSlug: string
  initialContent: SiteContent; initialColor: string; initialTemplate: string
  initialLogo: string | null; initialCover: string | null; isPublished: boolean
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
const TEMPLATES: {id: TemplateId; label: string}[] = [
  {id:'moderna',label:'Moderna'},{id:'clasica',label:'Clásica'},{id:'minimalista',label:'Minimalista'},
  {id:'bold',label:'Bold'},{id:'sunset',label:'Sunset'},{id:'vibrante',label:'Vibrante'},
  {id:'glass',label:'Glass'},{id:'elegante',label:'Elegante'},{id:'dark',label:'Dark'},
]
const FONTS = [
  {id:'inter',label:'Inter',family:'Inter, sans-serif',google:''},
  {id:'sora',label:'Sora',family:"'Sora', sans-serif",google:'Sora:wght@400;600;700;800'},
  {id:'playfair',label:'Playfair Display',family:"'Playfair Display', serif",google:'Playfair+Display:wght@400;700;800'},
  {id:'space',label:'Space Grotesk',family:"'Space Grotesk', sans-serif",google:'Space+Grotesk:wght@400;500;700'},
  {id:'poppins',label:'Poppins',family:"'Poppins', sans-serif",google:'Poppins:wght@400;500;600;700'},
  {id:'montserrat',label:'Montserrat',family:"'Montserrat', sans-serif",google:'Montserrat:wght@400;500;700;800'},
  {id:'raleway',label:'Raleway',family:"'Raleway', sans-serif",google:'Raleway:wght@400;500;700;800'},
  {id:'nunito',label:'Nunito',family:"'Nunito', sans-serif",google:'Nunito:wght@400;600;700;800'},
  {id:'dm',label:'DM Sans',family:"'DM Sans', sans-serif",google:'DM+Sans:wght@400;500;700'},
  {id:'lora',label:'Lora',family:"'Lora', serif",google:'Lora:wght@400;600;700'},
  {id:'merriweather',label:'Merriweather',family:"'Merriweather', serif",google:'Merriweather:wght@400;700'},
  {id:'outfit',label:'Outfit',family:"'Outfit', sans-serif",google:'Outfit:wght@400;500;700'},
]
const SECTIONS_LIST = [
  {key:'hero',label:'Hero'},{key:'nosotros',label:'Nosotros'},{key:'servicios',label:'Servicios'},
  {key:'galeria',label:'Galería'},{key:'resenas',label:'Reseñas'},{key:'contacto',label:'Contacto'},
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
function ServiceCard({ s, i, color, dark, vib, onChangeSvc, onUploadImg, onRemove }: {
  s: Service; i: number; color: string; dark: boolean; vib: boolean
  onChangeSvc: (i: number, f: keyof Service, v: string) => void
  onUploadImg: (i: number, file: File) => void
  onRemove: (i: number) => void
}) {
  const imgRef = useRef<HTMLInputElement>(null)  // ✅ hook en componente, no en map
  const fg    = dark||vib ? 'white' : '#111827'
  const muted = dark ? 'rgba(255,255,255,0.5)' : vib ? 'rgba(255,255,255,0.75)' : '#9ca3af'
  const bg    = dark ? 'rgba(255,255,255,0.04)' : vib ? 'rgba(255,255,255,0.15)' : 'white'
  const brd   = dark ? 'rgba(255,255,255,0.08)' : '#f0f0f0'

  return (
    <div style={{background:bg,border:`1px solid ${brd}`,borderRadius:14,overflow:'hidden',position:'relative'}}>
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
        <div style={{display:'flex',alignItems:'center',gap:'0.375rem'}}>
          <span style={{fontSize:'0.75rem',color:muted}}>Precio:</span>
          <div contentEditable suppressContentEditableWarning
               style={{...eBase,color,fontWeight:700,fontSize:'0.875rem',minWidth:40}}
               onFocus={onFocusEdit} onBlur={e=>{clearEdit(e.currentTarget);onChangeSvc(i,'price',e.currentTarget.innerText.trim())}}
               onMouseEnter={onHoverEdit} onMouseLeave={onLeaveHover}>{s.price||'Agregar precio'}</div>
        </div>
      </div>
    </div>
  )
}

export default function SiteEditorClient({
  businessId, businessName, businessSlug,
  initialContent, initialColor, initialTemplate, initialLogo, initialCover, isPublished: initPublished,
}: Props) {
  const [content,   setContent]   = useState<SiteContent>(initialContent)
  const [name,      setName]      = useState(businessName)
  const [color,     setColor]     = useState(initialColor)
  const [template,  setTemplate]  = useState<TemplateId>((initialTemplate as TemplateId)||'moderna')
  const [colorH,    setColorH]    = useState(initialContent.theme?.headingColor ?? '')
  const [colorT,    setColorT]    = useState(initialContent.theme?.textColor ?? '')
  const [colorBg,   setColorBg]   = useState(initialContent.theme?.bgColor ?? '')
  const [fontId,    setFontId]    = useState('inter')
  const [fontOpen,  setFontOpen]  = useState(false)
  const [logo,      setLogo]      = useState<string|null>(initialLogo)
  const [cover,     setCover]     = useState<string|null>(initialCover)
  const [gallery,   setGallery]   = useState<string[]>((initialContent.gallery??[]) as string[])
  const [viewport,  setViewport]  = useState<'desktop'|'movil'>('desktop')
  const [panel,     setPanel]     = useState<'plantilla'|'secciones'|'acciones'>('plantilla')
  const [sections,  setSections]  = useState({hero:true,nosotros:true,servicios:true,galeria:true,resenas:true,contacto:true})
  const [saveState, setSaveState] = useState<'saved'|'saving'|'unsaved'>('saved')
  const [published, setPublished] = useState(initPublished)
  const [publishing,setPublishing]= useState(false)

  const logoRef   = useRef<HTMLInputElement>(null)
  const coverRef  = useRef<HTMLInputElement>(null)
  const galleryRef= useRef<HTMLInputElement>(null)
  const font = FONTS.find(f=>f.id===fontId)??FONTS[0]

  const colorHRef  = useRef(colorH)
  const colorTRef  = useRef(colorT)
  const colorBgRef = useRef(colorBg)
  useEffect(()=>{ colorHRef.current  = colorH  },[colorH])
  useEffect(()=>{ colorTRef.current  = colorT  },[colorT])
  useEffect(()=>{ colorBgRef.current = colorBg },[colorBg])

  const save = useCallback(async (c:SiteContent,n:string,col:string,tpl:TemplateId) => {
    setSaveState('saving')
    const withTheme:SiteContent = {
      ...c,
      theme: {
        ...(c.theme ?? {}),            // preserva galleryFrame, logoShape, logoSize, etc.
        headingColor: colorHRef.current  || undefined,
        textColor:    colorTRef.current  || undefined,
        bgColor:      colorBgRef.current || undefined,
      }
    }
    try {
      await fetch('/api/save-site',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({business_id:businessId,content:withTheme,business_name:n,template_id:tpl,primary_color:col})})
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

  // ── Tema ────────────────────────────────────────────────
  const hasCover = !!(cover&&cover.trim().length>5)
  const dark=template==='dark'; const vib=template==='vibrante'; const eleg=template==='elegante'; const mini=template==='minimalista'
  const over=hasCover||dark||vib
  const pageBg=colorBg||(dark?'#0a0a0f':vib?color:eleg?'#faf9f7':'#fff')
  const navBg=dark?'rgba(0,0,0,0.65)':vib?'rgba(255,255,255,0.1)':'white'
  const brd=dark?'rgba(255,255,255,0.08)':'#f0f0f0'
  const muted=colorT||(dark?'rgba(255,255,255,0.5)':vib?'rgba(255,255,255,0.75)':'#6b7280')
  const sectBg=dark?'rgba(255,255,255,0.02)':vib?'rgba(0,0,0,0.08)':'#f9fafb'
  const navFg=colorH||(dark||vib?'white':'#111827')
  const heroFg=colorH||(over?'white':'#111827')
  const ctaBg=over?'white':color; const ctaFg=over?color:'white'
  const heroBg=hasCover
    ?`linear-gradient(rgba(0,0,0,0.45),rgba(0,0,0,0.45)), url(${cover}) center/cover`
    :dark?`radial-gradient(ellipse at 50% 0%, ${color}30, transparent 70%)`
    :vib?`linear-gradient(135deg,${color},${color}cc)`:mini?'white':`linear-gradient(135deg,${color}14,${color}04)`

  const S: React.CSSProperties={fontSize:9,fontWeight:700,color:'#3d3d5c',letterSpacing:'0.12em',textTransform:'uppercase',marginBottom:8}

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100vh',background:'#13131f',fontFamily:'Inter,sans-serif'}}>

      {/* TOP BAR */}
      <div style={{display:'flex',alignItems:'center',gap:10,padding:'8px 16px',background:'#0f0f1a',borderBottom:'1px solid rgba(255,255,255,0.06)',flexShrink:0}}>
        <a href="/dashboard" style={{color:'#6b6b8a',fontSize:12,textDecoration:'none'}}>← Dashboard</a>
        <span style={{color:'#e2e8f0',fontSize:13,fontWeight:600}}>Editor visual</span>
        <span style={{background:published?'rgba(16,185,129,0.15)':'rgba(245,158,11,0.15)',color:published?'#6ee7b7':'#fcd34d',border:`1px solid ${published?'rgba(16,185,129,0.3)':'rgba(245,158,11,0.3)'}`,fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>
          {published?'PUBLICADO':'BORRADOR'}
        </span>
        <div style={{flex:1}}/>
        <div style={{display:'flex',background:'rgba(255,255,255,0.05)',borderRadius:8,padding:2}}>
          {(['desktop','movil'] as const).map(v=>(
            <button key={v} onClick={()=>setViewport(v)} style={{padding:'4px 12px',borderRadius:6,border:'none',cursor:'pointer',fontSize:11,fontWeight:600,fontFamily:'Inter,sans-serif',background:viewport===v?'rgba(99,102,241,0.3)':'transparent',color:viewport===v?'#a5b4fc':'#4b4b6b'}}>
              {v==='desktop'?'Desktop':'Móvil'}
            </button>
          ))}
        </div>
        <span style={{fontSize:11,color:saveState==='saved'?'#10b981':saveState==='saving'?'#f59e0b':'#ef4444'}}>
          {saveState==='saved'?'● Guardado':saveState==='saving'?'⟳ Guardando...':'● Cambios sin guardar'}
        </span>
        {published&&<a href={`/sitio/${businessSlug}`} target="_blank" style={{fontSize:11,color:'#a5b4fc',border:'1px solid rgba(99,102,241,0.3)',padding:'4px 10px',borderRadius:6,textDecoration:'none'}}>Ver sitio ↗</a>}
        <button
          onClick={()=>save(content,name,color,template)}
          disabled={saveState==='saving'||saveState==='saved'}
          style={{background:saveState==='unsaved'?'rgba(16,185,129,0.15)':'rgba(255,255,255,0.05)',color:saveState==='unsaved'?'#6ee7b7':'#4b4b6b',border:`1px solid ${saveState==='unsaved'?'rgba(16,185,129,0.3)':'rgba(255,255,255,0.08)'}`,padding:'6px 14px',borderRadius:8,fontSize:12,fontWeight:700,cursor:saveState==='unsaved'?'pointer':'default',fontFamily:'Inter,sans-serif',transition:'all 0.2s'}}
        >
          {saveState==='saving'?'⟳ Guardando...':'💾 Guardar'}
        </button>
        <button onClick={publish} disabled={publishing} style={{background:'linear-gradient(135deg,#6366f1,#8b5cf6)',color:'white',border:'none',padding:'6px 16px',borderRadius:8,fontSize:12,fontWeight:700,cursor:publishing?'not-allowed':'pointer',opacity:publishing?0.6:1,fontFamily:'Inter,sans-serif',boxShadow:'0 2px 12px rgba(99,102,241,0.4)'}}>
          {publishing?'Publicando...':published?'✓ Republicar':'🚀 Publicar sitio'}
        </button>
      </div>

      <div style={{display:'flex',flex:1,overflow:'hidden'}}>

        {/* PANEL IZQ */}
        <div style={{width:210,background:'#0f0f1a',borderRight:'1px solid rgba(255,255,255,0.06)',display:'flex',flexDirection:'column',flexShrink:0,overflowY:'auto'}}>
          <div style={{display:'flex',padding:'8px 8px 0',gap:2,borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
            {(['plantilla','secciones','acciones'] as const).map(p=>(
              <button key={p} onClick={()=>setPanel(p)} style={{flex:1,padding:'6px 2px',border:'none',cursor:'pointer',fontSize:10,fontWeight:700,borderRadius:'6px 6px 0 0',fontFamily:'Inter,sans-serif',textTransform:'capitalize',background:panel===p?'rgba(99,102,241,0.15)':'transparent',color:panel===p?'#a5b4fc':'#3d3d5c',borderBottom:panel===p?'2px solid #6366f1':'2px solid transparent'}}>
                {p.charAt(0).toUpperCase()+p.slice(1)}
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
                  <p style={S}>Plantilla</p>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
                    {TEMPLATES.map(t=>(
                      <button key={t.id} onClick={()=>setTpl(t.id)} style={{background:template===t.id?'rgba(99,102,241,0.12)':'rgba(255,255,255,0.03)',border:`1.5px solid ${template===t.id?'rgba(99,102,241,0.45)':'rgba(255,255,255,0.06)'}`,borderRadius:8,padding:6,cursor:'pointer',textAlign:'left',fontFamily:'Inter,sans-serif'}}>
                        <div style={{height:28,borderRadius:5,marginBottom:4,background:t.id==='dark'?'#0a0a0f':t.id==='bold'?'#111827':t.id==='glass'?'#0f172a':t.id==='vibrante'||t.id==='sunset'?`linear-gradient(135deg,${color},${color}bb)`:t.id==='elegante'?'#faf9f7':'white',border:'1px solid rgba(255,255,255,0.06)',display:'flex',flexDirection:'column',padding:'3px 5px',gap:3}}>
                          <div style={{height:4,borderRadius:2,background:color,opacity:0.9}}/><div style={{height:2,borderRadius:1,background:'rgba(128,128,128,0.25)'}}/>
                        </div>
                        <p style={{fontSize:10,fontWeight:600,color:template===t.id?'#a5b4fc':'#6b6b8a'}}>{t.label}</p>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p style={S}>Color principal</p>
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
                  <p style={S}>Fuente tipográfica</p>
                  <div style={{position:'relative'}}>
                    <button onClick={()=>setFontOpen(!fontOpen)} style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 10px',borderRadius:8,cursor:'pointer',background:'rgba(255,255,255,0.04)',border:`1.5px solid ${fontOpen?'rgba(99,102,241,0.45)':'rgba(255,255,255,0.08)'}`,fontFamily:'Inter,sans-serif'}}>
                      <span style={{fontSize:12,color:'#e2e8f0',fontFamily:font.family}}>{font.label}</span>
                      <span style={{color:'#4b4b6b',fontSize:10}}>{fontOpen?'▲':'▼'}</span>
                    </button>
                    {fontOpen&&(
                      <div style={{position:'absolute',top:'100%',left:0,right:0,zIndex:50,background:'#1a1a2e',border:'1px solid rgba(255,255,255,0.1)',borderRadius:10,marginTop:4,maxHeight:260,overflowY:'auto',boxShadow:'0 8px 32px rgba(0,0,0,0.5)'}}>
                        {FONTS.map(f=>(
                          <button key={f.id} onClick={()=>{setFontId(f.id);setFontOpen(false)}} style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'9px 12px',border:'none',cursor:'pointer',textAlign:'left',background:fontId===f.id?'rgba(99,102,241,0.15)':'transparent',borderBottom:'1px solid rgba(255,255,255,0.04)',fontFamily:'Inter,sans-serif'}}>
                            <div><p style={{fontSize:13,fontFamily:f.family,color:'#e2e8f0',marginBottom:1}}>{f.label}</p><p style={{fontSize:10,fontFamily:f.family,color:'#4b4b6b'}}>Aa Bb 123</p></div>
                            {fontId===f.id&&<span style={{color:'#a5b4fc',fontSize:12}}>✓</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <p style={S}>Imágenes</p>
                  <input ref={logoRef} type="file" accept="image/*" style={{display:'none'}} onChange={async e=>{const f=e.target.files?.[0];if(!f)return;const u=await upload(f,'logo');if(u){setLogo(u);sched(content,name,color,template)}}}/>
                  <input ref={coverRef} type="file" accept="image/*" style={{display:'none'}} onChange={async e=>{const f=e.target.files?.[0];if(!f)return;const u=await upload(f,'cover');if(u){setCover(u);sched(content,name,color,template)}}}/>
                  <input ref={galleryRef} type="file" accept="image/*" multiple style={{display:'none'}} onChange={async e=>{const files=Array.from(e.target.files??[]);const urls=(await Promise.all(files.map(f=>upload(f,'gallery')))).filter(Boolean) as string[];const next=[...gallery,...urls].slice(0,12);setGallery(next);const nc={...content,gallery:next};setContent(nc);sched(nc,name,color,template)}}/>
                  <div style={{display:'flex',flexDirection:'column',gap:5}}>
                    {[{label:'Logo',icon:'🏷',state:logo,ref:logoRef},{label:'Portada',icon:'🖼',state:cover,ref:coverRef}].map(item=>(
                      <button key={item.label} onClick={()=>item.ref.current?.click()} style={{display:'flex',alignItems:'center',gap:8,padding:'7px 10px',borderRadius:8,border:`1.5px dashed ${item.state?'rgba(99,102,241,0.5)':'rgba(255,255,255,0.1)'}`,background:'rgba(255,255,255,0.02)',cursor:'pointer',fontFamily:'Inter,sans-serif'}}>
                        {item.state?<img src={item.state} alt="" style={{width:22,height:22,objectFit:'contain',borderRadius:4}}/>:<span style={{fontSize:14}}>{item.icon}</span>}
                        <span style={{fontSize:10,color:item.state?'#a5b4fc':'#4b4b6b',fontWeight:500}}>{item.state?`Cambiar ${item.label.toLowerCase()}`:`Subir ${item.label.toLowerCase()}`}</span>
                      </button>
                    ))}
                    <button onClick={()=>galleryRef.current?.click()} style={{display:'flex',alignItems:'center',gap:8,padding:'7px 10px',borderRadius:8,border:`1.5px dashed ${gallery.length>0?'rgba(99,102,241,0.5)':'rgba(255,255,255,0.1)'}`,background:'rgba(255,255,255,0.02)',cursor:'pointer',fontFamily:'Inter,sans-serif'}}>
                      <span style={{fontSize:14}}>📸</span><span style={{fontSize:10,color:gallery.length>0?'#a5b4fc':'#4b4b6b',fontWeight:500}}>{gallery.length>0?`${gallery.length} foto${gallery.length>1?'s':''} · Agregar`:'Galería de trabajos'}</span>
                    </button>
                  </div>
                </div>

                {/* ── Logo: tamaño + forma ── */}
                {logo&&(
                  <div>
                    <p style={S}>Tamaño del logo</p>
                    <div style={{display:'flex',gap:4,marginBottom:10}}>
                      {LOGO_SIZES.map(s=>(
                        <button key={s.id} onClick={()=>setThemeField('logoSize',s.id)} style={{flex:1,padding:'5px 2px',borderRadius:6,border:`1.5px solid ${(content.theme?.logoSize??'md')===s.id?'rgba(99,102,241,0.6)':'rgba(255,255,255,0.08)'}`,background:(content.theme?.logoSize??'md')===s.id?'rgba(99,102,241,0.12)':'rgba(255,255,255,0.03)',cursor:'pointer',color:(content.theme?.logoSize??'md')===s.id?'#a5b4fc':'#4b4b6b',fontSize:10,fontWeight:700,fontFamily:'Inter,sans-serif'}}>{s.label}</button>
                      ))}
                    </div>
                    <p style={S}>Forma del logo</p>
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

                {/* ── Marco de galería ── */}
                {gallery.length>0&&(
                  <div>
                    <p style={S}>Marco de galería</p>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:4}}>
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
                  </div>
                )}

              </div>
            )}

            {panel==='secciones'&&(
              <div style={{display:'flex',flexDirection:'column',gap:4}}>
                <p style={S}>Secciones visibles</p>
                {SECTIONS_LIST.map(s=>(
                  <div key={s.key} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 10px',borderRadius:8,background:'rgba(255,255,255,0.03)'}}>
                    <span style={{fontSize:11,color:'#8b8bab'}}>{s.label}</span>
                    <div onClick={()=>setSections(prev=>({...prev,[s.key]:!prev[s.key as keyof typeof prev]}))} style={{width:32,height:18,borderRadius:9,position:'relative',cursor:'pointer',background:sections[s.key as keyof typeof sections]?color:'rgba(255,255,255,0.1)',transition:'background 0.2s'}}>
                      <div style={{width:14,height:14,background:'white',borderRadius:7,position:'absolute',top:2,transition:'left 0.2s',left:sections[s.key as keyof typeof sections]?15:2}}/>
                    </div>
                  </div>
                ))}
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
                <div style={{marginTop:8,borderTop:'1px solid rgba(255,255,255,0.06)',paddingTop:10,display:'flex',flexDirection:'column',gap:4}}>
                  <a href="/dashboard/sitio" style={{display:'block',padding:'7px 10px',borderRadius:7,border:'1px solid rgba(255,255,255,0.06)',background:'rgba(255,255,255,0.03)',color:'#8b8bab',fontSize:10,textDecoration:'none'}}>🔄 Regenerar con IA</a>
                  <button onClick={()=>save(content,name,color,template)} style={{padding:'7px 10px',borderRadius:7,border:'1px solid rgba(255,255,255,0.06)',background:'rgba(255,255,255,0.03)',color:'#8b8bab',fontSize:10,cursor:'pointer',textAlign:'left',fontFamily:'Inter,sans-serif'}}>💾 Guardar ahora</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* PREVIEW */}
        <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',background:'#1a1a2e'}} onClick={()=>fontOpen&&setFontOpen(false)}>
          <div style={{padding:'6px 16px',background:'rgba(99,102,241,0.08)',borderBottom:'1px solid rgba(99,102,241,0.15)',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
            <span style={{fontSize:11,color:'rgba(165,180,252,0.7)'}}>✏ Haz clic en cualquier texto para editarlo directamente</span>
          </div>
          <div style={{flex:1,overflowY:'auto',padding:20,display:'flex',justifyContent:'center',alignItems:'flex-start'}}>
            <div style={{width:viewport==='movil'?390:'100%',maxWidth:viewport==='movil'?390:960,borderRadius:12,overflow:'hidden',boxShadow:'0 20px 60px rgba(0,0,0,0.6)',transition:'width 0.3s',fontFamily:font.family}}>

              {/* SITIO */}
              <div style={{background:pageBg,minHeight:'100vh',color:navFg}}>

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
                        <h2 style={{fontSize:'1.5rem',fontWeight:800,textAlign:'center',marginBottom:'0.5rem',color:navFg}}>Servicios</h2>
                        <p style={{textAlign:'center',fontSize:11,color:'rgba(165,180,252,0.6)',marginBottom:'1.5rem'}}>Clic en campo para editar · Clic en imagen para cambiarla</p>
                        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(210px,1fr))',gap:'1.25rem',maxWidth:'960px',margin:'0 auto'}}>
                          {/* ✅ ServiceCard como componente separado — sin hooks en map */}
                          {(content.services as Service[]).map((s,i)=>(
                            <ServiceCard key={i} s={s} i={i} color={color} dark={dark} vib={vib}
                              onChangeSvc={editSvc} onUploadImg={uploadSvcImg} onRemove={removeSvc}/>
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
                    <h2 style={{fontSize:'1.5rem',fontWeight:800,textAlign:'center',marginBottom:'2rem',color:navFg}}>Nuestros trabajos</h2>
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
            <span style={{fontSize:10,color:'#3d3d5c'}}>Plantilla: <span style={{color:'#a5b4fc'}}>{TEMPLATES.find(t=>t.id===template)?.label}</span>{' · '}<span style={{color:'#a5b4fc',fontFamily:font.family}}>{font.label}</span></span>
            <span style={{fontSize:10,color:'#3d3d5c',fontFamily:'JetBrains Mono,monospace'}}>amelia.app/sitio/{businessSlug}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
