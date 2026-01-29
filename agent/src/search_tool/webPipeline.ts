import { RunnableLambda, RunnableSequence } from "@langchain/core/runnables";
import { webSearch } from "../utils/webSearch";
import { openUrl } from "../utils/openUrl";
import { Summarize } from "../utils/summarize";
import { url } from "inspector";
import { candidate } from "./type";
import { getChatModel } from "../shared/model";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

const searchTopResults=5
export const webSearchStep=RunnableLambda.from(
    async (input:{q:string;mode:"web"|"direct"})=>{
        const results=await webSearch(input.q)
        return{
            ...input,
            results,
        }
    } 
)

export const openAndSummarizeSetup=RunnableLambda.from(
    async (input:{q:string;mode:"web"|"direct"; results:any[]})=>{
        if((!Array.isArray(input.results))||input.results.length==0){
            return {
                ...input,
                pageSummaries:[],
                fallback:"No-reuslt" as const
            }
        }
        const extractTopResults=input.results.slice(0,searchTopResults)
        console.log("DEkh",extractTopResults)
        const settledResults=await Promise.allSettled(
            extractTopResults.map(async (result:any) => {
                try {
                  const opened = await openUrl(result.url);
                  const summarizeContent = await Summarize(opened.content);
                  return { url: opened.url, summary: summarizeContent.summary };
                } catch (err) {
                  console.warn("open/summarize failed for", result.url, err);
                  throw err;
                }
              })
        )
        console.log("dude")
        settledResults.forEach((r,idx) => {
            if (r.status === "rejected") console.warn("failed:", extractTopResults[idx]?.url, r.reason);
          });
        const settledResultsPageSummaries=settledResults.filter(
            settledResult=>settledResult.status=='fulfilled'
        ).map(s=> s.value)
        //edge case
        if(settledResultsPageSummaries.length==0)
        {
            const fallbackSnippetSummaries=extractTopResults.map((result:any)=>(
                {
                    url:result.url,
                    summary:String(result.snippet||result.title||"").trim()
                }
            )).filter((x:any)=>x.summary.length>0)
            return{
                ...input,
                pageSummaries:fallbackSnippetSummaries,
                fallback:"snippet" as const
            }
        }
        return{
            ...input,
            pageSummaries:settledResultsPageSummaries,
            fallback:"none " as const
        }

    }

)

export const ComposeStep=RunnableLambda.from(
    async (input:{
        q:string,
        pageSummaries:Array<{url:string,summary:string}>
        mode:'web'|'direct',
        fallback:'none'|'sniipet'|"No-reuslt"
    }):Promise<candidate>=>{
        const model=getChatModel({temperature:0.2})
        console.log("model dekh le bhai",model)
        if(!input.pageSummaries||input.pageSummaries.length==0){
            const directAnsFromModel=await model.invoke([
                new SystemMessage([
                    "Your Annwer Clearly for begginers",
                    "if unsure say no"
                ].join('\n')),
                new HumanMessage(input.q)
            ])
            const directAns=typeof directAnsFromModel.content=="string"?directAnsFromModel.content:String(directAnsFromModel.content).trim()
                return {
                    answer:directAns,
                    sources:[],
                    mode:'direct'
                }
            
        }
        const res=await model.invoke([
            new SystemMessage([
                "you concisely answer questions suing provided PageSummaries",
                "Rules_",
                "Be accurate and neutral",
                "5-8 Sentence Maximum",
                "Use only th eprovided summary;do not invent new facts"

            ].join("\n")),
            new HumanMessage([
                `Question:${input.q}`,
                "summaries",
                JSON.stringify(input.pageSummaries,null,2)
            ].join("\n"))
        ])
        const finalAns=(typeof res.content=="string"?res.content:String(res.content))
        console.log("dekh na",finalAns)
        const extractedSources=input.pageSummaries.map(x=>x.url)
        return {
            answer:finalAns,
            sources:extractedSources,
            mode:'web'

        }
    }
)
export const webPath=RunnableSequence.from([
    webSearchStep,openAndSummarizeSetup,ComposeStep
])