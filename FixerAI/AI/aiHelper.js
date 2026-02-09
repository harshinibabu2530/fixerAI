export async function loadMemory() {
    try {
        const res = await fetch("../ai_memory.json");
        const data = await res.json();
        console.log("AI Memory Loaded:", data);
        return data;
    } catch (err) {
        console.error("Failed to load AI memory", err);
        return null;
    }
}

export function buildPrompt(message, memory, role) {
    return `
You are a smart service assistant.

User role: ${role}

Known services:
${JSON.stringify(memory ? memory.roles : {}, null, 2)}

Statuses:
${JSON.stringify(memory ? memory.status_explanations : {}, null, 2)}

User message:
"${message}"

Reply simply and clearly.
`;
}
