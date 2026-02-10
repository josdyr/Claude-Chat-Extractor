const btn = document.getElementById("export");
const status = document.getElementById("status");

btn.addEventListener("click", async () => {
  btn.disabled = true;
  status.textContent = "Exporting…";
  status.className = "";

  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];

    if (!tab?.url?.includes("claude.ai")) {
      throw new Error("Navigate to a claude.ai chat first");
    }

    const response = await browser.tabs.sendMessage(tab.id, { action: "exportChat" });

    if (response?.success) {
      status.textContent = response.message;
      status.className = "success";
    } else {
      throw new Error(response?.message || "Export failed");
    }
  } catch (err) {
    status.textContent = err.message;
    status.className = "error";
  } finally {
    btn.disabled = false;
  }
});
