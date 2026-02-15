/**
 * Paybuntu AI Support Assistant
 * Provides automated responses based on app knowledge.
 */

const PaybuntuAI = {
    knowledgeBase: {
        greeting: {
            keywords: ["hi", "hello", "hey", "good morning", "good afternoon", "good evening"],
            response: "Hello! I'm the Paybuntu Assistant. I can help you with transfers, setting up your PIN, or explaining the virtual signup bonus. How can I assist you?"
        },
        thanks: {
            keywords: ["thanks", "thank you", "thx", "appreciate", "helpful"],
            response: "You're very welcome! Is there anything else about Paybuntu I can help you with? I'm here 24/7."
        },
        ok: {
            keywords: ["ok", "okay", "alright", "i see", "understood"],
            response: "Great! Let me know if you need help with anything else, like sending money or securing your account."
        },
        bonus: {
            keywords: ["bonus", "welcome", "25000", "25,000", "free money", "signup"],
            response: "Upon signing up, every Paybuntu user receives a virtual NGN 25,000 welcome bonus. Please note that this is virtual credit for demonstration purposes within this app."
        },
        transfer: {
            keywords: ["transfer", "send", "money", "payment", "send money"],
            response: "To send money, go to the 'Transfers' tab in your dashboard. You'll need the recipient's email address or account number. Make sure you have set up your 4-digit Transaction PIN first!"
        },
        pin: {
            keywords: ["pin", "transaction pin", "security pin", "setup pin", "change pin"],
            response: "You can set up or change your 4-digit Transaction PIN in the 'Settings' section. This PIN is required for every transfer to keep your account secure."
        },
        withdraw: {
            keywords: ["withdraw", "cash out", "bank account", "real money"],
            response: "Paybuntu is currently a demonstration project for educational purposes. All funds are virtual, and real-world withdrawals are not supported in this demo version."
        },
        dangerous: {
            keywords: ["dangerous", "warning", "security warning", "red screen", "scam"],
            response: "If you see a security warning, please don't worry! Paybuntu is a safe demo project. We have recently updated our Privacy Policy and Terms of Service, and we have requested a review from Google to remove the warning."
        },
        contact: {
            keywords: ["contact", "human", "admin", "speak", "person", "help"],
            response: "I've logged your request for a human administrator. An admin will review our chat and get back to you if I couldn't answer your question fully."
        },
        demo: {
            keywords: ["demo", "what is", "about", "real"],
            response: "Paybuntu is a proof-of-concept digital banking interface. It demonstrates modern web features like real-time transactions, secure authentication, and administrative controls, but it does not process real currency."
        }
    },

    fallback: "I'm not quite sure about that. Would you like me to notify a human administrator? Or you can ask about the welcome bonus, transfers, or how to set up your PIN!",

    generateResponse: function(userMessage) {
        const msg = userMessage.toLowerCase();
        
        // Find best match
        for (let category in this.knowledgeBase) {
            if (category === "welcome") continue;
            const data = this.knowledgeBase[category];
            if (data.keywords && data.keywords.some(k => msg.includes(k))) {
                return data.response;
            }
        }

        return this.fallback;
    }
};

// Log AI activation
console.log("Paybuntu AI Support System Initialized.");
