const button = document.querySelector("#inspect");
const status = document.querySelector("#status");

button.addEventListener("click", async () => {
  button.disabled = true;
  status.textContent = "Checking the active portal…";
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const result = await chrome.runtime.sendMessage({
      type: "INSPECT_ACTIVE_PORTAL",
      tabId: tab?.id,
      url: tab?.url,
    });
    status.textContent = result?.message ?? "No supported status was found.";
  } catch {
    status.textContent = "The page could not be checked. Nothing was sent.";
  } finally {
    button.disabled = false;
  }
});
