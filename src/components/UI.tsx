import { useEffect, useId } from 'react';
import type { PropsWithChildren, ReactNode } from 'react';
import { ArrowRight, Check, ChevronDown, Package, Plus, Search, X } from 'lucide-react';
import type { NewLine, Product, StockBin } from '../domain/types';
import { shelfBins } from '../domain/selectors';
import { available } from '../domain/selectors';
import type { WarehouseState } from '../domain/types';

export function Button({ children, onClick, variant = 'primary', disabled, type='button', icon, className = '' }: PropsWithChildren<{ onClick?: () => void; variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; disabled?: boolean; type?: 'submit' | 'button'; icon?: ReactNode; className?: string }>) {
  return <button className={`button button-${variant} ${className}`} onClick={onClick} disabled={disabled} type={type}>{icon}{children}</button>;
}
export function PanelTitle({ kicker, title, action }: { kicker?: string; title: string; action?: ReactNode }) {
  return <div className="panel-heading"><div>{kicker && <span className="eyebrow">{kicker}</span>}<h2>{title}</h2></div>{action}</div>;
}
export function Empty({ title, message, action }: {title: string; message: string; action?: ReactNode}) {
  return <div className="empty"><span className="empty-icon"><Package size={24}/></span><h3>{title}</h3><p>{message}</p>{action}</div>;
}
export function Modal({ title, subtitle, children, onClose, wide = false }: PropsWithChildren<{ title: string; subtitle?: string; onClose: () => void; wide?: boolean }>) {
  const id = useId();
  useEffect(() => { const onKey = (e: KeyboardEvent) => { if (e.key==='Escape') onClose(); }; document.addEventListener('keydown',onKey); return () => document.removeEventListener('keydown',onKey); },[onClose]);
  return <div className="modal-backdrop" onMouseDown={e => { if(e.target === e.currentTarget) onClose(); }}><section className={`modal ${wide?'modal-wide':''}`} role="dialog" aria-modal="true" aria-labelledby={id}><header className="modal-header"><div><h2 id={id}>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={19}/></button></header><div className="modal-body">{children}</div></section></div>;
}
export function Field({ label, children, hint }: PropsWithChildren<{label: string; hint?: string}>) { return <label className="field"><span className="field-label">{label}</span>{children}{hint && <small>{hint}</small>}</label>; }
export function Step({ index, label, done, active }: {index: number; label: string; done: boolean; active: boolean}) {
  return <div className={`step ${done?'step-done':''} ${active?'step-active':''}`}><span className="step-index">{done ? <Check size={14}/> : index}</span><span>{label}</span></div>;
}
export function SearchBox({ value, onChange, placeholder='Search...' }: {value: string; onChange: (v:string)=>void; placeholder?:string}) {
  return <label className="search"><Search size={17}/><input type="search" value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}/></label>;
}
export function LineEditor({ state, value, onChange, forOrder=false }: {state: WarehouseState; value: NewLine[]; onChange: (lines:NewLine[])=>void; forOrder?:boolean}) {
  const setRow = (index:number, patch:Partial<NewLine>)=>onChange(value.map((l,i)=>i===index?{...l,...patch}:l));
  return <div className="line-editor"><div className="line-head"><span>PRODUCT</span><span>QUANTITY</span><span></span></div>{value.map((line,i)=><div className="line-edit-row" key={i}><div className="select-wrap"><select aria-label={`Product ${i+1}`} value={line.productId} required onChange={e=>setRow(i,{productId:e.target.value})}><option value="">Choose a product</option>{state.products.map(p=><option key={p.id} value={p.id}>{p.name} · {p.sku}{forOrder?` (${available(state,p.id)} free)`:''}</option>)}</select><ChevronDown size={15}/></div><input aria-label={`Quantity ${i+1}`} type="number" min={1} step={1} value={line.quantity || ''} onChange={e=>setRow(i,{quantity:Number(e.target.value)})} required/><button type="button" title="Remove product" className="icon-button" disabled={value.length===1} onClick={()=>onChange(value.filter((_,j)=>i!==j))}><X size={17}/></button></div>)}<button type="button" className="add-line" onClick={()=>onChange([...value,{productId:'',quantity:1}])}><Plus size={15}/> Add another product</button></div>;
}
export function ShelfSelect({ state, value, onChange, label='Shelf' }: {state:WarehouseState;value:StockBin; onChange:(v:StockBin)=>void; label?: string}) { return <Field label={label}><div className="select-wrap"><select value={value} onChange={e=>onChange(e.target.value as StockBin)}>{shelfBins(state).map(b=><option key={b} value={b}>Shelf {b}</option>)}</select><ChevronDown size={15}/></div></Field>; }
export function PageIntro({ index, label, title, description, action }: {index:string;label:string;title:string;description:string;action?:ReactNode}) {
 return <div className="page-intro"><div><div className="section-label"><span>{index}</span><span className="dash"/>{label}</div><h1>{title}</h1><p>{description}</p></div>{action && <div className="page-action">{action}</div>}</div>;
}
export function Pill({ children, tone='neutral' }: PropsWithChildren<{tone?:'neutral'|'warning'|'success'|'blue'|'accent'}>) {return <span className={`pill pill-${tone}`}><span className="pill-dot"/>{children}</span>;}
export function InlineLink({ children, onClick }: PropsWithChildren<{onClick:()=>void}>) {return <button type="button" className="inline-link" onClick={onClick}>{children}<ArrowRight size={15}/></button>;}
export function ProductGlyph({ product, size='md' }: {product:Product;size?:'sm'|'md'}) {
  const shape = product.category === 'Apparel' ? 'a' : product.category==='Equipment'?'e': product.category==='Supplies'?'s':'c';
  return <span className={`product-glyph product-glyph-${shape} glyph-${size}`}><Package size={size==='sm'?16:19} strokeWidth={1.7}/></span>;
}
