const OPTIONS = [
  ["showNavigation", "Navigation", "Previous channel and other movement commands."],
  ["showClipboard", "Clipboard", "Copy current location, channel links, and IDs."],
  ["showServers", "Servers", "Jump to a server's first available text channel."],
  ["showChannels", "Channels", "Search and jump to text channels."],
  ["showDirectMessages", "Direct Messages", "Search and jump to your DMs."],
  ["showDevelopment", "Development", "Show plugin information and reload guidance."]
];

function createSettingsPanel({settings}) {
  const root = document.createElement("div");
  root.className = "cc-settings";
  root.innerHTML = "<h2>Command Center</h2><p>Choose what appears in your command palette.</p>";

  for (const [key, title, description] of OPTIONS) {
    const row = document.createElement("label");
    row.className = "cc-settings-row";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = settings.get(key);
    checkbox.addEventListener("change", () => settings.set(key, checkbox.checked));
    const text = document.createElement("span");
    text.innerHTML = `<strong>${title}</strong><small>${description}</small>`;
    row.append(checkbox, text);
    root.append(row);
  }

  const limit = document.createElement("label");
  limit.className = "cc-settings-limit";
  limit.textContent = "Results shown at once";
  const input = document.createElement("input");
  input.type = "number";
  input.min = "5";
  input.max = "30";
  input.value = String(settings.get("resultLimit"));
  input.addEventListener("change", () => {
    settings.set("resultLimit", input.value);
    input.value = String(settings.get("resultLimit"));
  });
  limit.append(input);
  root.append(limit);
  return root;
}

module.exports = {createSettingsPanel};
