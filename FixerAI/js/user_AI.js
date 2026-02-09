import { supabaseClient } from "./supabaseClient.js";
import { loadMemory as loadStaticMemory, buildPrompt } from "../AI/aiHelper.js";

const GEMINI_API_KEY = "AIzaSyA6mNbshWB5Z_dFK0mwbrPvDPaCwbHxIj4";

const toggleBtn = document.getElementById("toggleAI");
const closeBtn = document.getElementById("closeAI");
const chatWindow = document.getElementById("aiChatWindow");
const askBtn = document.getElementById("askAI");
const inputField = document.getElementById("aiInput");
const messagesContainer = document.getElementById("aiMessages");
const typingIndicator = document.getElementById("typingIndicator");

// Toggle Chat Window
if (toggleBtn) {
    toggleBtn.onclick = () => chatWindow.classList.toggle("active");
}
if (closeBtn) {
    closeBtn.onclick = () => chatWindow.classList.remove("active");
}

function addMessage(text, role) {
    const msgDiv = document.createElement("div");
    msgDiv.className = `message ${role}`;
    msgDiv.innerText = text;
    messagesContainer.appendChild(msgDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Memory Persistence Functions
async function savePersistentMemory(userId, role, message) {
    try {
        await supabaseClient.from("ai_memory").insert({
            user_id: userId,
            role,
            message,
        });
    } catch (err) {
        console.error("Save Memory Error:", err);
    }
}

async function loadPersistentMemory(userId, role) {
    try {
        const { data } = await supabaseClient
            .from("ai_memory")
            .select("message")
            .eq("user_id", userId)
            .eq("role", role)
            .order("created_at", { ascending: false })
            .limit(5);

        return data?.reverse().map(m => m.message).join("\n") || "";
    } catch (err) {
        console.error("Load Memory Error:", err);
        return "";
    }
}

async function sendMessage() {
    const msg = inputField.value.trim();
    if (!msg) return;

    // Add user message to UI
    addMessage(msg, "user");
    inputField.value = "";

    // Show typing indicator
    typingIndicator.style.display = "block";
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    try {
        // 1. Get User Data
        const { data: authData } = await supabaseClient.auth.getUser();
        const user = authData.user;
        if (!user) {
            addMessage("Please log in to use the AI assistant.", "ai");
            typingIndicator.style.display = "none";
            return;
        }

        const role = window.location.pathname.includes("worker") ? "worker" : "user";

        // 2. Load Memories
        const staticKnowledge = await loadStaticMemory();
        const pastContext = await loadPersistentMemory(user.id, role);

        // 3. Save current message
        await savePersistentMemory(user.id, role, `User: ${msg}`);

        // 4. Build Combined Prompt
        const corePrompt = buildPrompt(msg, staticKnowledge, role);
        const finalPrompt = `
${corePrompt}

---
Past conversation context (last few messages):
${pastContext}

Current User Message: ${msg}
`;

        const res = await fetch(
            `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash-001:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: finalPrompt }] }]
                })
            }
        );

        if (!res.ok) {
            const errorData = await res.json();
            console.error("Gemini API Error:", errorData);
            addMessage(`API Error: ${errorData.error?.message || "Unknown error"}`, "ai");
            typingIndicator.style.display = "none";
            return;
        }

        const data = await res.json();
        console.log("Gemini Response Data:", data);
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;

        // Hide typing indicator
        typingIndicator.style.display = "none";

        if (reply) {
            addMessage(reply, "ai");
            // 5. Save AI's reply to memory
            await savePersistentMemory(user.id, role, `AI: ${reply}`);
        } else {
            console.warn("No reply found in Gemini response", data);
            addMessage("I'm sorry, I couldn't generate a response. Please try again.", "ai");
        }
    } catch (error) {
        console.error("Full AI Logic Error:", error);
        typingIndicator.style.display = "none";
        addMessage(`System Error: ${error.message}`, "ai");
    }
}

if (askBtn) {
    askBtn.onclick = sendMessage;
}

if (inputField) {
    inputField.onkeypress = (e) => {
        if (e.key === "Enter") sendMessage();
    };
}
