import { API_BASE_URL } from "../../../shared/api/client.js";

export const QUICK_ACTIONS = {
  en: {
    Buyer: [
      { label: "🏠 Find a property", question: "How do I find and filter properties in Chennai?" },
      { label: "💰 0% Brokerage", question: "How does 0% brokerage work on Restamp?" },
      { label: "📅 Schedule visit", question: "How can I book a site visit with an owner?" },
      { label: "⭐ Saved properties", question: "Where do I find my shortlisted properties?" },
    ],
    Owner: [
      { label: "➕ Post property", question: "How do I list my property on Restamp?" },
      { label: "💎 Owner plans", question: "What owner subscription plans are available?" },
      { label: "📊 Leads & visits", question: "Where can I track my buyer leads and site visits?" },
      { label: "🛡️ Verification", question: "How does property verification work?" },
    ],
    Agent: [
      { label: "🏘️ Locality leads", question: "How do Chennai locality packages work for agents?" },
      { label: "📈 Agent dashboard", question: "What features are included in the Agent Dashboard?" },
      { label: "💼 Partner pricing", question: "What are the Agent Starter, Pro and Elite plans?" },
      { label: "❓ General help", question: "What can Reva AI assist me with?" },
    ],
  },
  ta: {
    Buyer: [
      { label: "🏠 சொத்து தேடல்", question: "சென்னையில் சொத்துகளை எவ்வாறு தேடுவது?" },
      { label: "💰 0% தரகு", question: "Restamp-ல் 0% தரகு எவ்வாறு செயல்படுகிறது?" },
      { label: "📅 பார்வை பதிவு", question: "சொத்துப் பார்வைக்கு எவ்வாறு நேரம் ஒதுக்குவது?" },
      { label: "⭐ விருப்பப் பட்டியல்", question: "எனது சேமிக்கப்பட்ட சொத்துகளை எங்கே பார்ப்பது?" },
    ],
    Owner: [
      { label: "➕ சொத்து பதிவு", question: "எனது சொத்தை Restamp-ல் எவ்வாறு பதிவு செய்வது?" },
      { label: "💎 உரிமையாளர் திட்டம்", question: "உரிமையாளர்களுக்கான திட்டங்கள் என்னென்ன?" },
      { label: "📊 வாடிக்கையாளர் தொடர்புகள்", question: "வாங்குபவர் தொடர்புகளை எங்கே பார்ப்பது?" },
      { label: "🛡️ சரிபார்ப்பு", question: "சொத்து சரிபார்ப்பு எவ்வாறு செயல்படுகிறது?" },
    ],
    Agent: [
      { label: "🏘️ பகுதி வாய்ப்புகள்", question: "சென்னை பகுதி தொகுப்புகள் எவ்வாறு செயல்படுகின்றன?" },
      { label: "📈 முகவர் டாஷ்போர்டு", question: "முகவர் டாஷ்போர்டில் என்னென்ன வசதிகள் உள்ளன?" },
      { label: "💼 கூட்டாளர் திட்டங்கள்", question: "முகவர் திட்டங்களின் விலை விவரங்கள் என்ன?" },
      { label: "❓ பொதுவான உதவி", question: "Reva AI எனக்கு எதில் உதவ முடியும்?" },
    ],
  },
};

const KNOWLEDGE_BASE_EN = [
  {
    keywords: ["find", "search", "explore", "filter", "apartment", "villa", "plot", "house", "rent", "buy", "locality", "omr", "anna nagar", "velachery", "chennai"],
    reply:
      "Restamp lets you browse verified residential and commercial properties across Chennai with 0% brokerage. You can filter by deal type (Buy, Rent, Lease), property type (Apartment, Independent House, Villa, Plot, Office), and prime localities like Anna Nagar, OMR, Velachery, and Adyar.",
    action: { label: "Explore Properties", route: "Search" },
  },
  {
    keywords: ["brokerage", "commission", "zero brokerage", "0%"],
    reply:
      "Restamp is a direct 100% zero-brokerage platform. Buyers and tenants connect directly with authentic property owners without middlemen or brokerage fees.",
    action: { label: "Browse Direct Listings", route: "Search" },
  },
  {
    keywords: ["list", "post", "sell", "publish", "add property", "new listing", "owner listing"],
    reply:
      "Listing your property takes less than 3 minutes through our guided 7-step owner flow: Select Category, Enter Details, Location & Pincode, Measurements & Floor, Amenities, Real Photos, and Submit. Once submitted, our automated engine verifies the listing for immediate visibility.",
    action: { label: "Post Your Property", route: "OwnerAdd" },
  },
  {
    keywords: ["plan", "pricing", "subscription", "starter", "plus", "gold", "premium", "cost", "charge", "fee"],
    reply:
      "Restamp offers 4 official Owner Plans:\n• RESTAMP STARTER (₹599) — 1 Listing, 30 Days, Unlimited Leads\n• RESTAMP PLUS (₹999) — 2 Listings, 30 Days, Unlimited Leads\n• RESTAMP GOLD (₹1,999) — 5 Listings, 60 Days, Relationship Manager [POPULAR]\n• RESTAMP PREMIUM (₹4,999) — 10 Listings, 90 Days, RM + Social Media Promo",
    action: { label: "View Owner Plans", route: "OwnerPlans" },
  },
  {
    keywords: ["visit", "schedule", "appointment", "booking", "timing", "tour"],
    reply:
      "You can schedule in-person site visits directly on any property detail page. Choose your preferred date and time slot. The owner receives instant notification to confirm or reschedule.",
    action: { label: "View Activity & Visits", route: "Activity" },
  },
  {
    keywords: ["saved", "shortlist", "favorite", "bookmark", "wishlist"],
    reply:
      "Tap the heart icon on any property card to save it. You can review and compare all your shortlisted properties anytime in the Activity tab.",
    action: { label: "Open Saved Properties", route: "Activity" },
  },
  {
    keywords: ["lead", "enquir", "inquir", "dashboard", "manage"],
    reply:
      "Property owners can view genuine buyer enquiries, contact requests, and schedule site visits from the Owner Dashboard and Leads screen.",
    action: { label: "Owner Dashboard", route: "OwnerDashboard" },
  },
  {
    keywords: ["agent", "broker", "partner", "localities", "elite", "agent plan"],
    reply:
      "Restamp Agent Partner plans empower local brokers with direct buyer leads mapped to chosen Chennai localities (5, 10, or 15 areas), plus a dedicated Agent Dashboard.",
    action: { label: "Agent Plans", route: "AgentPlans" },
  },
  {
    keywords: ["verify", "verification", "authentic", "trust", "safety"],
    reply:
      "Every property on Restamp goes through verification of address, photos, and owner authenticity. Verified listings receive a 'Verified' badge and top search placement.",
    action: { label: "Post Verified Property", route: "OwnerAdd" },
  },
];

const KNOWLEDGE_BASE_TA = [
  {
    keywords: ["தேட", "சொத்து", "வடிகட்டி", "வீடு", "வாடகை", "வாங்க", "சென்னை", "அண்ணா நகர்", "வேளச்சேரி", "omr"],
    reply:
      "Restamp மூலம் சென்னையில் உள்ள சரிபார்க்கப்பட்ட வீடுகள், அடுக்குமாடி குடியிருப்புகள் மற்றும் வீட்டுமனைகளை 0% தரகில் தேடலாம். வாங்க, வாடகைக்கு எடுக்க அல்லது குத்தகைக்கு பெற வடிகட்டிகளைப் பயன்படுத்தலாம்.",
    action: { label: "சொத்துகளைக் காண்க", route: "Search" },
  },
  {
    keywords: ["தரகு", "கமிஷன்", "0%", "இடைத்தரகர்"],
    reply:
      "Restamp 100% நேரடி தரகு இல்லாத தளம். வாங்குபவர்களும் வாடகைதாரர்களும் இடைத்தரகர்கள் இல்லாமல் நேரடியாக உரிமையாளர்களுடன் தொடர்பு கொள்ளலாம்.",
    action: { label: "நேரடி சொத்துகள்", route: "Search" },
  },
  {
    keywords: ["பதிவு", "விற்ப", "சேர்க்க", "சொத்து சேர்க்க"],
    reply:
      "உங்கள் சொத்தை Restamp-ல் பதிவு செய்ய 7 எளிய படிகள் உள்ளன: வகை தேர்வு, விவரங்கள், முகவரி & பின்கோட், பரப்பளவு, வசதிகள், புகைப்படங்கள் பதிவேற்றம் மற்றும் சமர்ப்பிப்பு. சமர்ப்பித்தவுடன் உடனடி சரிபார்ப்பு நடைபெறும்.",
    action: { label: "சொத்து பதிவு செய்ய", route: "OwnerAdd" },
  },
  {
    keywords: ["திட்டம்", "விலை", "ஸ்டார்ட்டர்", "பிளஸ்", "கோல்ட்", "பிரீமியம்", "கட்டணம்"],
    reply:
      "Restamp உரிமையாளர்களுக்கான 4 அதிகாரப்பூர்வ திட்டங்கள்:\n• RESTAMP STARTER (₹599) — 1 சொத்து பதிவு, 30 நாட்கள், வரம்பற்ற வாடிக்கையாளர் தொடர்புகள்\n• RESTAMP PLUS (₹999) — 2 சொத்து பதிவுகள், 30 நாட்கள்\n• RESTAMP GOLD (₹1,999) — 5 சொத்து பதிவுகள், 60 நாட்கள், தனி உதவியாளர் [பிரபலமானது]\n• RESTAMP PREMIUM (₹4,999) — 10 பதிவுகள், 90 நாட்கள், சமூக ஊடக விளம்பரம்",
    action: { label: "திட்டங்களைக் காண்க", route: "OwnerPlans" },
  },
  {
    keywords: ["பார்வை", "நேரம்", "பதிவு செய்ய", "பார்வையிட"],
    reply:
      "சொத்து விவரப் பக்கத்தில் நேரில் சென்று பார்க்க நீங்கள் விரும்பிய நாள் மற்றும் நேரத்தைத் தேர்ந்தெடுக்கலாம். உரிமையாளருக்கு உடனடி தகவல் சென்று உறுதிப்படுத்தப்படும்.",
    action: { label: "பார்வை விவரங்கள்", route: "Activity" },
  },
  {
    keywords: ["சேமித்த", "விருப்ப", "பிடித்தவை"],
    reply:
      "எந்தவொரு சொத்து அட்டை மீதும் உள்ள இதயக் குறியீட்டைத் தட்டி சேமிக்கலாம். சேமித்த சொத்துகளை 'செயல்பாடு' பகுதியில் எப்போது வேண்டுமானாலும் பார்க்கலாம்.",
    action: { label: "சேமிக்கப்பட்டவை", route: "Activity" },
  },
  {
    keywords: ["தொடர்பு", "டாஷ்போர்டு", "விசாரணை"],
    reply:
      "உரிமையாளர் டாஷ்போர்டில் வாங்குபவர்களின் விசாரணைகள், தொலைபேசி கோரிக்கைகள் மற்றும் பார்வை நேரங்களை எளிதாக நிர்வகிக்கலாம்.",
    action: { label: "உரிமையாளர் பகுதி", route: "OwnerDashboard" },
  },
];

export function getLocalAiReply(question, role = "Buyer", language = "en") {
  const query = String(question || "").toLowerCase();
  const isTamil = language === "ta";
  const kb = isTamil ? KNOWLEDGE_BASE_TA : KNOWLEDGE_BASE_EN;

  for (const item of kb) {
    if (item.keywords.some((kw) => query.includes(kw))) {
      return {
        text: item.reply,
        action: item.action,
        language,
        demo: true,
      };
    }
  }

  // Cross-language fallback if user typed English keywords in Tamil mode or vice-versa
  const otherKb = isTamil ? KNOWLEDGE_BASE_EN : KNOWLEDGE_BASE_TA;
  for (const item of otherKb) {
    if (item.keywords.some((kw) => query.includes(kw))) {
      return {
        text: item.reply,
        action: item.action,
        language,
        demo: true,
      };
    }
  }

  // Fallback role-tailored guidance
  if (isTamil) {
    if (role === "Owner") {
      return {
        text: "உரிமையாளர் சொத்து பதிவு, சந்தா திட்டங்கள் மற்றும் வாங்குபவர் தொடர்புகளை நிர்வகிக்க நான் உதவ முடியும். உங்களுக்கு என்ன உதவி வேண்டும்?",
        action: { label: "உரிமையாளர் பகுதி", route: "OwnerDashboard" },
        language: "ta",
        demo: true,
      };
    }
    if (role === "Agent") {
      return {
        text: "சென்னை பகுதி முகவர் திட்டங்கள் மற்றும் வாடிக்கையாளர் தொடர்புகளை நிர்வகிக்க நான் உதவ முடியும். எவ்வாறு உதவலாம்?",
        action: { label: "முகவர் திட்டங்கள்", route: "AgentPlans" },
        language: "ta",
        demo: true,
      };
    }
    return {
      text: "நான் Reva AI, உங்கள் Restamp சொத்து உதவியாளர். சென்னையில் வீடுகள் தேடுதல், 0% தரகு மற்றும் சொத்துப் பார்வைக்கு உதவ முடியும். என்னிடம் கேளுங்கள்!",
      action: { label: "சொத்துகளைக் காண்க", route: "Search" },
      language: "ta",
      demo: true,
    };
  }

  if (role === "Owner") {
    return {
      text: "I can help you list properties, choose an Owner plan, review tenant leads, or track scheduled site visits. What would you like to do?",
      action: { label: "Owner Dashboard", route: "OwnerDashboard" },
      language: "en",
      demo: true,
    };
  }

  if (role === "Agent") {
    return {
      text: "I can assist you with agent locality packages, buyer leads, and the agent dashboard. How can I help your real estate business today?",
      action: { label: "Agent Locality Select", route: "AgentPlans" },
      language: "en",
      demo: true,
    };
  }

  return {
    text: "I'm Reva AI, your personal Restamp property assistant. I can help you search properties in Chennai, understand 0% brokerage, schedule site visits, or post a property. Ask me anything!",
    action: { label: "Explore Chennai Homes", route: "Search" },
    language: "en",
    demo: true,
  };
}

export function getResolvedChatUrl() {
  const envUrl = process.env.EXPO_PUBLIC_CHAT_API_URL;
  if (envUrl && envUrl.trim().length > 0) {
    return envUrl.trim();
  }
  return `${API_BASE_URL}/chat`;
}

export function getResolvedTranscribeUrl() {
  const chatUrl = getResolvedChatUrl();
  return chatUrl.replace(/\/chat\/?$/, "/transcribe");
}

export async function sendRevaChat({ question, role = "Buyer", language = "en", history = [], signal, accessToken }) {
  const trimmed = String(question || "").trim();
  const lang = language === "ta" ? "ta" : "en";
  if (!trimmed) {
    return {
      text: lang === "ta" ? "உங்களுக்கு உதவ உங்கள் கேள்வியைத் தட்டச்சு செய்யவும் அல்லது பேசவும்." : "Please enter or speak a question so I can assist you.",
      language: lang,
      demo: true,
    };
  }

  const chatUrl = getResolvedChatUrl();

  try {
    const headers = { "Content-Type": "application/json" };
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

    const response = await fetch(chatUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        message: trimmed,
        role,
        language: lang,
        history: history.slice(-8).map((m) => ({
          role: m.from === "user" ? "user" : "assistant",
          content: m.text,
        })),
      }),
      signal,
    });

    if (response.ok) {
      const data = await response.json();
      if (data && typeof data.reply === "string" && data.reply.trim().length > 0) {
        const local = getLocalAiReply(trimmed, role, lang);
        return {
          text: data.reply,
          action: local.action,
          language: data.language || lang,
          demo: !!data.demo,
        };
      }
    }
  } catch (err) {
    if (signal?.aborted) throw err;
  }

  return getLocalAiReply(trimmed, role, lang);
}

/**
 * Upload audio recording to the transcription endpoint (/transcribe).
 * Supports native file URI on iOS/Android and Blob/File on Web.
 */
export async function transcribeVoice({ uri, blob, language = "en", accessToken, signal }) {
  const transcribeUrl = getResolvedTranscribeUrl();
  const lang = language === "ta" ? "ta" : "en";

  const formData = new FormData();
  formData.append("language", lang);

  if (blob) {
    // Web browser MediaRecorder blob
    const filename = `reva-voice-${Date.now()}.${blob.type?.includes("webm") ? "webm" : "wav"}`;
    formData.append("file", blob, filename);
  } else if (uri) {
    // React Native native file object
    const ext = /\.wav(?:$|[?#])/i.test(uri) ? "wav" : /\.mp3(?:$|[?#])/i.test(uri) ? "mp3" : "m4a";
    const mimeType = ext === "wav" ? "audio/wav" : ext === "mp3" ? "audio/mpeg" : "audio/mp4";
    formData.append("file", {
      uri,
      name: `reva-question.${ext}`,
      type: mimeType,
    });
  } else {
    throw new Error("NO_AUDIO_DATA");
  }

  const headers = {};
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const response = await fetch(transcribeUrl, {
    method: "POST",
    headers,
    body: formData,
    signal,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || typeof data.text !== "string") {
    throw new Error(data.detail || data.error || "TRANSCRIPTION_FAILED");
  }

  return data.text.trim();
}
