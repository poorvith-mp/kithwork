import { cors } from './cors.ts'
export function json(origin:string|null,body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:{...cors(origin),'Content-Type':'application/json','Cache-Control':'no-store'}})}
export function safeError(origin:string|null,status:number,message:string){return json(origin,{ok:false,error:message},status)}
