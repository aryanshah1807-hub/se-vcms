import {useState,useEffect} from 'react';
import {api,TRANSITIONS} from './api.js';
const today=new Date().toISOString().slice(0,10);
const SERVICES=['Check-up','Vaccination','Grooming','Surgery consult'];

export default function Appointments({data,role,reload}){
 const owner=role==='Pet Owner';
 const [f,setF]=useState({patientId:'',vetId:'',service:SERVICES[0],date:today,time:''});
 const [slots,setSlots]=useState([]); const [msg,setMsg]=useState(null);
 const [fv,setFv]=useState(''); const [fd,setFd]=useState('');
 useEffect(()=>{f.vetId&&api.slots(f.vetId,f.date).then(setSlots)},[f.vetId,f.date,data.appts]);
 const book=async e=>{e.preventDefault();setMsg(null);
  try{await api.book({...f,source:owner?'owner':'staff',user:role});setMsg({ok:owner?'Request sent. The clinic will confirm it.':'Appointment booked.'});setF({...f,time:''});reload()}
  catch(x){setMsg({err:x.message})}};
 const act=async(fn)=>{setMsg(null);try{await fn();reload()}catch(x){setMsg({err:x.message})}};
 const rows=data.appts.filter(a=>(!fv||a.vetId===+fv)&&(!fd||a.date===fd)).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
 const actionsFor=a=>[
  ...(!owner&&a.status==='Requested'?[['Confirm',()=>api.setStatus(a.id,'Scheduled',role)]]:[]),
  ...(!owner&&a.status==='Scheduled'?[['Check in',()=>api.setStatus(a.id,'Checked-In',role)],['Reschedule',()=>{const d=prompt('New date (YYYY-MM-DD)',a.date),t=d&&prompt('New time (HH:MM)',a.time);return d&&t&&api.reschedule(a.id,d,t,role)}]]:[]),
  ...(role==='Veterinarian'&&a.status==='Checked-In'?[['Start consult',()=>api.setStatus(a.id,'In-Progress',role)]]:[]),
  ...(role==='Veterinarian'&&a.status==='In-Progress'?[['Complete',()=>api.setStatus(a.id,'Completed',role)]]:[]),
  ...(TRANSITIONS[a.status].includes('Cancelled')?[['Cancel',()=>api.setStatus(a.id,'Cancelled',role,prompt('Reason for cancelling?'))]]:[])];
 return <>
  <section><h2>{owner?'Request an appointment':'Book an appointment'}</h2>
   <form onSubmit={book}><div className="grid">
    <label>Pet<select required value={f.patientId} onChange={e=>setF({...f,patientId:e.target.value})}><option value="">Select</option>{data.patients.map(p=><option key={p.id} value={p.id}>{p.name} ({p.owner})</option>)}</select></label>
    <label>Veterinarian<select required value={f.vetId} onChange={e=>setF({...f,vetId:e.target.value,time:''})}><option value="">Select</option>{data.vets.map(v=><option key={v.id} value={v.id}>{v.name} ({v.start}:00–{v.end}:00)</option>)}</select></label>
    <label>Service<select value={f.service} onChange={e=>setF({...f,service:e.target.value})}>{SERVICES.map(s=><option key={s}>{s}</option>)}</select></label>
    <label>Date<input type="date" min={today} value={f.date} onChange={e=>setF({...f,date:e.target.value,time:''})}/></label>
    <label>Available time<select required value={f.time} onChange={e=>setF({...f,time:e.target.value})}><option value="">{f.vetId?'Select a slot':'Choose a vet first'}</option>{slots.map(s=><option key={s}>{s}</option>)}</select></label>
   </div>
   {msg?.err&&<div className="err" role="alert">{msg.err}</div>}{msg?.ok&&<div className="ok">{msg.ok}</div>}
   <button className="btn" style={{marginTop:12}}>{owner?'Send request':'Book appointment'}</button></form></section>

  <section><h2>Calendar</h2>
   <div className="row" style={{marginBottom:12}}>
    <label>Veterinarian<select value={fv} onChange={e=>setFv(e.target.value)}><option value="">All</option>{data.vets.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</select></label>
    <label>Date<input type="date" value={fd} onChange={e=>setFd(e.target.value)}/></label></div>
   {rows.length?<table><thead><tr><th>When</th><th>Pet</th><th>Vet</th><th>Service</th><th>Status</th><th></th></tr></thead><tbody>
    {rows.map(a=><tr key={a.id}><td>{a.date}<br/>{a.time}</td><td>{a.patient}</td><td>{a.vet}</td><td>{a.service}</td>
     <td><span className={`chip ${a.status}`}>{a.status}</span>{a.reason&&<><br/><small>{a.reason}</small></>}</td>
     <td><div className="row">{actionsFor(a).map(([l,fn])=><button key={l} className={`btn ${l==='Cancel'?'danger':'alt'}`} onClick={()=>act(fn)}>{l}</button>)}</div></td></tr>)}
   </tbody></table>:<div className="empty">No appointments match. Book one above.</div>}</section>
 </>;
}
