"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsoleKitConfig = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.ConsoleKitConfig = {
    baseUrl: process.env.CONSOLE_KIT_BASE_URL,
    apiKey: process.env.CONSOLE_KIT_API_KEY,
};
