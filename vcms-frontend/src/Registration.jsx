import {useState} from 'react';
import {api} from './api.js';
const blank={client:{name:'',phone:'',email:'',address:''},pet:{name:'',species:'Dog',breed:'',sex:'M',dob:'',microchip:''}};

export default function Registration({data,role,reload}){
 const [f,setF]=useState(blank); const [msg,setMsg]=useState(null); const [dup,setDup]=useState(null);
 const [mergeFrom,setMergeFrom]=useState(''); const [mergeInto,setMergeInto]=useState('');
 const set=(k,key)=>e=>setF({...f,[k]:{...f[k],[key]:e.target.value}});
 const submit=async(confirm=false)=>{
  setMsg(null);
  try{await api.registerClient({...f,confirm,user:role});setF(blank);setDup(null);setMsg({ok:'Client and pet registered.'});reload()}
  catch(e){e.code===409?setDup(e.message):setMsg({err:e.message})}
 };
 const merge=async()=>{try{await api.mergeClients(+mergeInto,+mergeFrom,role);setMsg({ok:'Clients merged. Pets and appointments moved to the kept record.'});setMergeFrom('');setMergeInto('');reload()}catch(e){setMsg({err:e.message})}};
 const F=(k,key,label,type='text',req)=><label>{label}<input type={type} required={req} value={f[k][key]} onChange={set(k,key)}/></label>;
 return <>
  <section><h2>Register a client and pet</h2>
   <form onSubmit={e=>{e.preventDefault();submit()}}>
    <div className="grid">{F('client','name','Owner name','text',1)}{F('client','phone','Phone','tel',1)}{F('client','email','Email','email')}{F('client','address','Address')}</div>
    <h2 style={{marginTop:20}}>Pet details</h2>
    <div className="grid">{F('pet','name','Pet name','text',1)}
     <label>Species<select value={f.pet.species} onChange={set('pet','species')}>{['Dog','Cat','Bird','Rabbit','Other'].map(s=><option key={s}>{s}</option>)}</select></label>
     {F('pet','breed','Breed')}
     <label>Sex<select value={f.pet.sex} onChange={set('pet','sex')}><option value="M">Male</option><option value="F">Female</option></select></label>
     {F('pet','dob','Date of birth','date')}{F('pet','microchip','Microchip number')}</div>
    {dup&&<div className="warn" role="alert"><span>{dup} Register anyway?</span>
     <button type="button" className="btn" onClick={()=>submit(true)}>Register anyway</button>
     <button type="button" className="btn alt" onClick={()=>setDup(null)}>Cancel</button></div>}
    {msg?.err&&<div className="err" role="alert">{msg.err}</div>}{msg?.ok&&<div className="ok">{msg.ok}</div>}
    <button className="btn" style={{marginTop:12}}>Save client and pet</button>
   </form></section>

  <section><h2>Clients ({data.clients.length})</h2>
   {data.clients.length?<table><thead><tr><th>Owner</th><th>Contact</th><th>Pets</th><th></th></tr></thead><tbody>
    {data.clients.map(c=><tr key={c.id}><td>{c.name}<br/><small>#{c.id}</small></td><td>{c.phone}<br/>{c.email}</td>
     <td>{c.pets.map(p=>`${p.name} (${p.species})`).join(', ')||'No pets'}</td>
     <td><button className="btn alt" onClick={async()=>{await api.deactivateClient(c.id,role);reload()}}>Mark inactive</button></td></tr>)}
   </tbody></table>:<div className="empty">No clients yet. Register the first one above.</div>}</section>

  {['Receptionist','Clinic Administrator'].includes(role)&&<section><h2>Merge duplicate clients</h2>
   <div className="row" style={{alignItems:'end'}}>
    <label>Duplicate to remove<select value={mergeFrom} onChange={e=>setMergeFrom(e.target.value)}><option value="">Select</option>{data.clients.map(c=><option key={c.id} value={c.id}>{c.name} (#{c.id})</option>)}</select></label>
    <label>Client to keep<select value={mergeInto} onChange={e=>setMergeInto(e.target.value)}><option value="">Select</option>{data.clients.map(c=><option key={c.id} value={c.id}>{c.name} (#{c.id})</option>)}</select></label>
    <button className="btn" disabled={!mergeFrom||!mergeInto} onClick={merge}>Merge clients</button></div></section>}
 </>;
}
