import dotenv from "dotenv";
dotenv.config();

export const ConsoleKitConfig = {
  baseUrl: process.env.CONSOLE_KIT_BASE_URL!,
  apiKey: process.env.CONSOLE_KIT_API_KEY!,
};
