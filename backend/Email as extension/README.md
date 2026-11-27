# Mail Copilot — 100% Standalone Gmail Extension

No Python backend, no `.env` file, no localhost server needed! Everything runs directly inside Chrome using **Composio** (for 1-click Google login & fast 50–500 bulk emails) and **Groq** (optional, for AI Reply).

## Features
1. **🔒 Composio Login Gate**: Paste your Composio API Key (saved locally in Chrome) and click **Connect Google via Composio**.
2. **📨 Bulk Campaign**: Upload a `.csv` file (50–500 rows) and send **Custom Personalized (`{{name}}`)** or **Fast Single BCC** emails with a live **⛔ Stop Dispatch** button.
3. **✨ AI Reply**: Click inside any Gmail reply box to insert an AI-generated reply (uses your optional Groq API key).

## How to Load in Chrome
1. Open `chrome://extensions` and turn on **Developer mode**.
2. Click **Load unpacked** and select:
   `D:\CODE JAANI CODE\minor\new backend\Email as extension`
3. Open or refresh `https://mail.google.com`.
