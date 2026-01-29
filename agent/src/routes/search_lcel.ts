import { Router } from "express";
import { SearchInputSchema } from "../utils/schemas";
import { runSearch } from "../search_tool/searchChain";

export const searchRouter=Router()
searchRouter.post('/',async (req,res)=>{
    try{
        const input=SearchInputSchema.parse(req.body)
        const result=await runSearch(input)
        res.status(200).json(result)
    }catch(e){
        const msh=(e as Error)?.message ??'unknown Eroor occured'
      return  res.status(400).json({error:msh})
    }
})