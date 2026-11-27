const CLOUD_URL = "https://solitary-breeze-cc12.priyanshukesharwani-offical.workers.dev";

chrome.storage.local.get(["mailCopilotAuth", "mailCopilotSettings"], (res) => {
  const auth = res.mailCopilotAuth || {};
  const settings = res.mailCopilotSettings || {};

  document.getElementById("composioKey").value = auth.composioApiKey || "";
  document.getElementById("groqKey").value = auth.groqKey || "";
  document.getElementById("signature").value = settings.signature || "";
  document.getElementById("autoReply").checked = Boolean(settings.autoReply);
});

document.getElementById("saveBtn").addEventListener("click", () => {
  const composioApiKey = document.getElementById("composioKey").value.trim();
  const groqKey = document.getElementById("groqKey").value.trim();
  const signature = document.getElementById("signature").value;
  const cloudUrl = CLOUD_URL;
  const autoReply = document.getElementById("autoReply").checked;

  chrome.storage.local.get(["mailCopilotAuth"], (res) => {
    const prevAuth = res.mailCopilotAuth || {};
    const nextAuth = {
      ...prevAuth,
      loggedIn: Boolean(composioApiKey),
      composioApiKey,
      groqKey
    };

    chrome.storage.local.set(
      {
        mailCopilotAuth: nextAuth,
        mailCopilotSettings: { signature, cloudUrl, autoReply }
      },
      async () => {
        const msg = document.getElementById("msg");
        if (cloudUrl && composioApiKey) {
          try {
            await fetch(`${cloudUrl.replace(/\/$/, "")}/register-user`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                composioApiKey,
                groqKey,
                connectedAccountId: prevAuth.connectedAccountId || "",
                userId: prevAuth.userId || "default",
                signature,
                autoReply
              })
            });
            msg.textContent = "Saved & Synced to Cloud!";
          } catch {
            msg.textContent = "Saved locally (Cloud sync failed).";
          }
        } else {
          msg.textContent = "Saved!";
        }
        setTimeout(() => (msg.textContent = ""), 2500);
      }
    );
  });
});
