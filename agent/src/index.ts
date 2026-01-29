import "dotenv/config";
import express from "express";
import cors from "cors";
import { searchRouter } from "./routes/search_lcel";
import { factCheckRouter } from "./routes/fact_check";
import { whatsappRouter } from "./routes/whatsapp";
const app = express();

app.use(
  cors({
    origin: process.env.ALLOWED_ORIGIN,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: false })); // For Twilio webhooks
app.use("/search", searchRouter);
app.use("/fact-check", factCheckRouter);
app.use("/whatsapp", whatsappRouter);
const port = process.env.PORT;
console.log(port);
app.listen(port, () => {
  console.log(`Listening on ${port} `);
});
