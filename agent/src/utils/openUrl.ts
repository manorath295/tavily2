
import {convert} from 'html-to-text'
import { OpenUrlOutputSchema } from './schemas'
export async function openUrl(url:string){
const normalized=validateUrl(url)
const res=await fetch(normalized,{
    headers:{
        'User-Agent':'agent-core/1.0  (+course-demo)'
    }
})
if(!res.ok){
    const text=await safeText(res)
    throw new Error(`Openurl Error ${res.status}-- ${text.slice(0,200)}`)
}
const contentType=res.headers.get('content-type')?? ''
const raw=await res.text()
const text = contentType.includes('text/html')
  ? convert(raw, {
      wordwrap: false,
      selectors: [
        { selector: 'nav', format: 'skip' },
        { selector: 'header', format: 'skip' },
        { selector: 'footer', format: 'skip' },
        { selector: 'script', format: 'skip' },
      ]
    })
  : raw;
    const cleaned=collapsewhitespace(text)
    const capped=cleaned.slice(0,8000)
    return OpenUrlOutputSchema.parse({
        url:normalized,
        content:capped
    })

}
function collapsewhitespace(s:string){
return s.replace(/\s+/g," ").trim()
}
function validateUrl(url: string) {
    try {
      const parsed = new URL(url);
  
      // https:
      if (!/^https?:$/.test(parsed.protocol)) {
        throw new Error('only http/https are supported');
      }
  
      return parsed.toString();
    } catch {
      throw new Error('Invalid Url');
    }

  }
  
  async function safeText(res:Response){
    try{
        return await res.json()
    }
    catch{
        return "<NOBody>"
    }
}