const encoder=new TextEncoder()
export async function sha256(value:string){const data=await crypto.subtle.digest('SHA-256',encoder.encode(value));return [...new Uint8Array(data)].map(v=>v.toString(16).padStart(2,'0')).join('')}
export function clientIp(req:Request){return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||req.headers.get('cf-connecting-ip')||'unknown'}
