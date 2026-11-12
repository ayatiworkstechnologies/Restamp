// Reva AI Voice & Text Chatbot (powered by Agaram 2.5B) unit and integration tests.
// Run with: node scripts/reva.test.mjs
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

let failures = 0;
function check(name, cond, extra) {
  if (cond) console.log(`ok - ${name}`);
  else {
    failures += 1;
    console.log(`FAIL - ${name}${extra !== undefined ? " :: " + JSON.stringify(extra) : ""}`);
  }
}

// 1. Verify quick actions and bilingual support
const chatServiceSource = readFileSync(
  join(ROOT, "src", "features", "reva", "services", "chatService.js"),
  "utf8"
);
check("R1 chatService exists and exports QUICK_ACTIONS", chatServiceSource.includes("export const QUICK_ACTIONS"));
check("R2 chatService supports English Buyer quick actions", chatServiceSource.includes("0% Brokerage"));
check("R3 chatService supports Tamil Buyer quick actions", chatServiceSource.includes("0% தரகு"));
check("R4 chatService exports transcribeVoice function", chatServiceSource.includes("export async function transcribeVoice"));

// 2. Verify i18n and Agaram 2.5B attribution
const i18nSource = readFileSync(join(ROOT, "src", "features", "reva", "i18n.js"), "utf8");
check("R5 i18n defines English and Tamil languages", i18nSource.includes('code: "en"') && i18nSource.includes('code: "ta"'));
check("R6 i18n defines recording and voice labels", i18nSource.includes("recording") && i18nSource.includes("transcribing"));
check("R7 i18n references Agaram 2.5B while preserving Reva AI name", i18nSource.includes("Agaram 2.5B") && i18nSource.includes("Reva AI"));

// 3. Verify RevaChatbot voice integration
const chatbotSource = readFileSync(
  join(ROOT, "src", "features", "reva", "components", "RevaChatbot.js"),
  "utf8"
);
check("R8 RevaChatbot imports expo-speech", chatbotSource.includes("expo-speech"));
check("R9 RevaChatbot imports expo-audio", chatbotSource.includes("expo-audio"));
check("R10 RevaChatbot supports push-to-talk microphone", chatbotSource.includes("toggleMicrophone"));
check("R11 RevaChatbot supports speech playback", chatbotSource.includes("speakWords"));
check("R12 RevaChatbot renders language switcher", chatbotSource.includes("languageBar"));

// 4. Verify App.js integration
const appSource = readFileSync(join(ROOT, "App.js"), "utf8");
check("R13 App.js wraps application with RevaProvider", appSource.includes("<RevaProvider>"));
check("R14 App.js conditionally renders RevaChatbot", appSource.includes("<RevaChatbot />"));

// 5. Verify AppBrandHeader.js Restamp logo is intact
const headerSource = readFileSync(
  join(ROOT, "src", "shared", "components", "AppBrandHeader.js"),
  "utf8"
);
check("R15 AppBrandHeader shows the RESTAMP wordmark", headerSource.includes("<RestampWordmark"));
check("R16 AppBrandHeader renders Reva AI shortcut button", headerSource.includes("Reva AI"));

// 6. Verify backend router voice, transcribe, and Agaram 2.5B model
const backendRouter = readFileSync(
  join(ROOT, "..", "restamp-backend", "app", "routers", "reva.py"),
  "utf8"
);
check("R17 backend reva router defines POST /chat", backendRouter.includes('@router.post("/chat"'));
check("R18 backend reva router defines POST /transcribe", backendRouter.includes('@router.post("/transcribe"'));
check("R19 backend reva router queries Agaram 2.5B", backendRouter.includes("_query_agaram"));
check("R20 backend reva router uses Agaram 2.5B model ID", backendRouter.includes("murai-labs/agaram-2.5b-instruct"));
check("R21 backend reva router includes Agaram crisis safety footer", backendRouter.includes("Tele-MANAS"));

const backendConfig = readFileSync(
  join(ROOT, "..", "restamp-backend", "app", "config.py"),
  "utf8"
);
check("R22 backend config declares AGARAM_ENDPOINT", backendConfig.includes("AGARAM_ENDPOINT"));

const backendMain = readFileSync(
  join(ROOT, "..", "restamp-backend", "app", "main.py"),
  "utf8"
);
check("R23 backend main registers reva router", backendMain.includes("reva_router.router"));

if (failures > 0) {
  console.error(`\n${failures} tests failed`);
  process.exit(1);
} else {
  console.log("\nall 23 Reva AI + Agaram 2.5B tests passed");
}
