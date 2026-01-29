import { RunnableSequence } from "@langchain/core/runnables";
import { FactCheckInput, FactCheckOutput } from "../utils/schemas";
import { extractClaimsStep } from "./extractClaims";
import { verifyClaimsStep } from "./verifyClaims";
import { calculateCredibilityStep } from "./calculateCredibility";

export const factCheckChain = RunnableSequence.from([
  extractClaimsStep,
  verifyClaimsStep,
  calculateCredibilityStep,
]);

export async function runFactCheck(
  input: FactCheckInput,
): Promise<FactCheckOutput> {
  return await factCheckChain.invoke(input);
}
