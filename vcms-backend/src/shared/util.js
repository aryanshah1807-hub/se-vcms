export class HttpError extends Error{constructor(status,message){super(message);this.status=status}}
export const h = fn => (req,res,next) => fn(req,res,next).catch(next);
export const nul = v => (v===''||v===undefined)?null:v;
export function errorHandler(err,req,res,next){
  if(err.name==='ZodError') return res.status(400).json({message:err.issues.map(i=>`${i.path.join('.')}: ${i.message}`).join('; ')});
  if(err.status) return res.status(err.status).json({message:err.message});
  // MySQL error code 1644: custom SIGNAL SQLSTATE '45000'
  if(err.errno === 1644 || err.code === 'ER_SIGNAL_EXCEPTION' || err.sqlState === '45000') {
    return res.status(400).json({message: err.sqlMessage || err.message || 'That change is not allowed.'});
  }
  // PostgreSQL compatibility fallbacks
  if(err.code==='23P01') return res.status(409).json({message:'That slot is already booked for this veterinarian.'});
  if(err.code==='23514') return res.status(400).json({message:err.message.replace(/^.*?:\s*/,'')||'That change is not allowed.'});
  if(err.code==='23503' || err.errno === 1452 || err.errno === 1451) return res.status(400).json({message:'A related record was not found or is in use.'});
  if(err.errno === 1062) return res.status(409).json({message:'Duplicate entry found.'});
  console.error(err); res.status(500).json({message:'Something went wrong on the server.'});
}
