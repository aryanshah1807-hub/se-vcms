// Drop-in replacement for vcms-frontend/src/api.js that talks to this backend.
// Also edit App.jsx: in the role <select> onChange, add:  api.useRole(e.target.value).then(load);
export const USE_MOCK = false;
export const TRANSITIONS = {Requested:['Scheduled','Cancelled'],Scheduled:['Checked-In','Cancelled'],'Checked-In':['In-Progress'],'In-Progress':['Completed'],Completed:[],Cancelled:[]};
const BASE = import.meta.env.VITE_API_URL || '/api';
const DEMO = {Receptionist:'ravi@vcms.test','Clinic Administrator':'admin@vcms.test',Veterinarian:'rao@vcms.test','Pet Owner':'meera@mail.com'};
let token=null, role='Receptionist';
const json = {'Content-Type':'application/json'};
async function login(){
  const r = await fetch(BASE+'/auth/login',{method:'POST',headers:json,body:JSON.stringify({email:DEMO[role],password:'Password@123'})});
  const j = await r.json(); if(!r.ok) throw {code:r.status,message:j.message}; token=j.token;
}
async function http(method,path,body){
  if(!token) await login();
  const r = await fetch(BASE+path,{method,headers:{...json,Authorization:'Bearer '+token},body:body?JSON.stringify(body):undefined});
  const fresh = r.headers.get('X-Refreshed-Token'); if(fresh) token=fresh;
  const j = await r.json().catch(()=>null);
  if(!r.ok) throw {code:r.status,message:j?.message||'Request failed.'};
  return j;
}
const owner = () => role==='Pet Owner';
export const api = {
  async useRole(r){ role=r; token=null; await login(); },
  clients: async()=> owner()?[]:http('GET','/clients'),
  patients: ()=>http('GET','/patients'),
  vets: ()=>http('GET','/vets'),
  appts: ()=>http('GET','/appointments'),
  audit: async()=> owner()?[]:http('GET','/audit'),
  notes: async()=> (await http('GET','/notifications')).map(n=>({...n,channel:n.channel})),
  registerClient: ({client,pet,confirm})=>http('POST','/clients',{client,pet,confirmDuplicate:!!confirm}),
  addPet: (clientId,pet)=>http('POST',`/clients/${clientId}/pets`,pet),
  deactivateClient: id=>http('PATCH',`/clients/${id}/deactivate`),
  mergeClients: (keepId,dropId)=>http('POST','/clients/merge',{keepId,dropId}),
  slots: (vetId,date)=> vetId&&date ? http('GET',`/vets/${vetId}/slots?date=${date}`) : [],
  book: ({patientId,vetId,service,date,time})=>http('POST','/appointments',{patientId:+patientId,vetId:+vetId,service,date,time}),
  setStatus: (id,status,user,reason)=>http('PATCH',`/appointments/${id}/status`,{status,reason}),
  reschedule: (id,date,time)=>http('PATCH',`/appointments/${id}/reschedule`,{date,time}),
};
