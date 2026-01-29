import { raw } from "express"
import { SummarizeInputSchema, SummarizeOutputSchema } from "./schemas"
import { getChatModel } from "../shared/model";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { isTypeQueryNode } from "typescript";

export async function Summarize(text:String){
const {text:raw}=SummarizeInputSchema.parse({text});
const clipped=clip(raw,4000)
const model=getChatModel({temperature:0.2})
const res=model.invoke([
    new SystemMessage(['you are helpfull assistant write short and accurate suammry',
        "Guidline:","-Be Factual and neutralavoid amrketting language",
        "-  5-8 sentences no lists unless absolutely needed",
        "Do no Invent sources just summarize the provided text",
        "--- keep it readable for begginers"].join('\n')),
    new HumanMessage(["summarize the folwwing contentfor a begginer friendly audience",
        "Focus on KeyFacts Remove Fluff",
        "Text:",
        clipped
    ].join('\n\n'))
])
const output = await res;

const rawModelOutput =
  typeof output.content === "string"
    ? output.content
    : output.content?.map(c => c?.text ?? "").join("\n") ?? "";

const summary = normalizeSummary(rawModelOutput);

return SummarizeOutputSchema.parse({ summary });

}
function normalizeSummary(s: string) {
    const t = s
      .replace(/\s+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  return  t.slice(0,2300)
   
  }
  
function clip(s:string,max:number){
    return s.length>max?s.slice(0,max):s
}