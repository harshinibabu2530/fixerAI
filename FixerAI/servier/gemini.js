import fetch from "node-fetch";
import express from "express";

const app = express();
app.use(express.json());

app.post("/ai", async (req, res) => {
    const prompt = req.body.prompt;

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash-001:generateContent?key=${"AIzaSyA6mNbshWB5Z_dFK0mwbrPvDPaCwbHxIj4"}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        }
    );

    const data = await response.json();
    res.json({ reply: data.candidates[0].content.parts[0].text });
});

app.listen(3000, () => console.log("AI server running"));

