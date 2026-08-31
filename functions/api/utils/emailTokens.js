const encoder=new TextEncoder();
function hex(buffer){return Array.from(new Uint8Array(buffer),(byte)=>byte.toString(16).padStart(2,'0')).join('');}
export function createToken(){const bytes=crypto.getRandomValues(new Uint8Array(32));return Array.from(bytes,(byte)=>byte.toString(16).padStart(2,'0')).join('');}
export async function tokenHash(token){return hex(await crypto.subtle.digest('SHA-256',encoder.encode(token)));}
export async function sendEmail(env,to,subject,html){if(!env.RESEND_API_KEY||!env.RESEND_FROM_EMAIL)return false;const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:env.RESEND_FROM_EMAIL,to,subject,html})});return response.ok;}
