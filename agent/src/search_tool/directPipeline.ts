//cheap mode
// dotn call tavily

import { RunnableLambda } from "@langchain/core/runnables";
import { candidate } from "./type";
import { getChatModel } from "../shared/model";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

export const directPath=RunnableLambda.from(
    async (input:{q:string,mode:'web'|'direct'}):Promise<candidate>=>{
        const model=getChatModel({temperature:0.2})
        const res=await model.invoke([
            new SystemMessage([
                "Your Annwer Clearly for begginers",
                "if unsure say no"
            ].join('\n')),
            new HumanMessage(input.q)
        ])
        const directAns=typeof res.content=="string"?res.content:String(res.content).trim()
        return {
            answer:directAns,
            sources:[],
            mode:'direct'
        }
    }
)