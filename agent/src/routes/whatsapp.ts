import { Router } from "express";
import { runFactCheck } from "../search_tool/factCheckChain";
import twilio from "twilio";
import { env } from "../shared/env";
import { FactCheckOutput } from "../utils/schemas";

export const whatsappRouter = Router();

// Twilio client (only initialize if credentials are provided)
let twilioClient: twilio.Twilio | null = null;

if (env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN) {
  twilioClient = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
  console.log("✅ Twilio client initialized");
} else {
  console.log("⚠️ Twilio credentials not found - WhatsApp feature disabled");
}

whatsappRouter.post("/webhook", async (req, res) => {
  console.log("\n📱 [WHATSAPP] Message received");

  const { Body, From } = req.body;
  console.log(`From: ${From}`);
  console.log(`Message: ${Body}`);

  if (!Body || !From) {
    console.error("❌ Missing Body or From in request");
    return res.status(400).send("<Response></Response>");
  }

  if (!twilioClient) {
    console.error("❌ Twilio client not initialized");
    return res.status(500).send("<Response></Response>");
  }

  try {
    // Run fact-check
    console.log("🚀 Starting fact-check for WhatsApp message...");
    const result = await runFactCheck({ content: Body });

    // Format response for WhatsApp
    const response = formatWhatsAppResponse(result);

    // Send reply via Twilio
    await twilioClient.messages.create({
      from: env.TWILIO_WHATSAPP_NUMBER,
      to: From,
      body: response,
    });

    console.log("✅ Reply sent to WhatsApp");

    // Respond to Twilio webhook
    res.status(200).send("<Response></Response>");
  } catch (error) {
    console.error("❌ WhatsApp error:", error);

    // Send error message to user
    try {
      if (twilioClient) {
        await twilioClient.messages.create({
          from: env.TWILIO_WHATSAPP_NUMBER,
          to: From,
          body: "Sorry, I couldn't verify that claim. Please try again later.",
        });
      }
    } catch (sendError) {
      console.error("❌ Failed to send error message:", sendError);
    }

    res.status(500).send("<Response></Response>");
  }
});

function formatWhatsAppResponse(result: FactCheckOutput): string {
  const { credibilityScore, verdict, claims, summary } = result;

  // Emoji based on score
  let emoji = "🔴";
  if (credibilityScore >= 70) emoji = "🟢";
  else if (credibilityScore >= 40) emoji = "🟡";

  let message = `${emoji} *Fact-Check Result*\n\n`;
  message += `📊 *Credibility:* ${credibilityScore}/100\n`;
  message += `🎯 *Verdict:* ${verdict}\n\n`;

  if (claims && claims.length > 0) {
    message += `*Claim:* ${claims[0].text}\n`;
    message += `*Confidence:* ${claims[0].confidence}%\n\n`;
  }

  message += `${summary}\n\n`;
  message += `_Powered by AI Fact-Checker_ ✨`;

  return message;
}
