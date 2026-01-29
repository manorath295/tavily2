import { RunnableLambda } from "@langchain/core/runnables";
import { candidate } from "./type";
import { SearchAnswerSchema } from "../utils/schemas";
import { getChatModel } from "../shared/model";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

export const finalValidateAndPolish=RunnableLambda.from(
    async (candidate:candidate)=>{
        const finalDraft={
            answer:candidate.answer,
            sources:candidate.sources??[]
        }
        const parsed1=SearchAnswerSchema.safeParse(finalDraft);
        if(parsed1.success) return parsed1.data
        //one shot repair
        const repaired=await repairSearchAns(finalDraft)
        const parsed2=SearchAnswerSchema.safeParse(repaired)
        if(parsed2.success)return parsed2.data
    }

)
async function repairSearchAns(obj:any):Promise<{answer:string,sources:string[]}>{
const model=getChatModel();
const response=await model.invoke([
    new SystemMessage([
        "You Fix Json Object To MAtcch A Given Schema",
        "Repsond Only with Valid Json Object",
        "Schema:{answer:string,sources:string[] (url as strings)}"
    ].join("\n")),
    new HumanMessage([
        "Make This Exactly TO The Schema.Ensure sources is array of url strings",
        "Input Json",
        JSON.stringify(obj)
    ].join("\n\n"))
])
const text=typeof response.content=="string"?response.content:String(response.content)
const json= extractJson(text)
return {
    answer:String(json?.answer ??"").trim(),
    sources:Array.isArray(json?.sources)? json.sources.map(String):[]
}
}
function extractJson(input:string){
    const start=input.indexOf("{")
    const end=input.indexOf("}")
    if(start==-1||end==-1||end<=start)return {}
    try{
        return JSON.parse(input.slice(start,end+1))
    }
    catch{
        return {}
    }
}