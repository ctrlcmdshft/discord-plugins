module.exports = `
.awaytimer-launcher {
  position: fixed;
  left: 18px;
  bottom: 78px;
  z-index: 10000;
  font-family: var(--font-primary, "gg sans", "Helvetica Neue", Helvetica, Arial, sans-serif);
}

.awaytimer-launcher-button,
.awaytimer-popover-button {
  border: 0;
  border-radius: 6px;
  background: var(--brand-500, #5865f2);
  color: #fff;
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
}

.awaytimer-launcher-button {
  min-width: 58px;
  height: 32px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.28);
}

.awaytimer-launcher-button:hover,
.awaytimer-popover-button:hover {
  filter: brightness(1.08);
}

.awaytimer-popover {
  position: absolute;
  left: 0;
  bottom: 42px;
  width: 260px;
  display: grid;
  gap: 10px;
  padding: 12px;
  color: var(--text-normal, #dbdee1);
  background: var(--background-floating, #111214);
  border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.12));
  border-radius: 8px;
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.45);
}

.awaytimer-popover[hidden] {
  display: none;
}

.awaytimer-popover-title {
  font-size: 14px;
  font-weight: 800;
}

.awaytimer-popover-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.awaytimer-popover-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 76px;
  gap: 8px;
}

.awaytimer-popover-button {
  min-height: 34px;
  padding: 7px 10px;
  background: var(--background-modifier-selected, rgba(255, 255, 255, 0.1));
  color: var(--text-normal, #f2f3f5);
}

.awaytimer-popover-button.primary {
  background: var(--brand-500, #5865f2);
  color: #fff;
}

.awaytimer-popover-button.secondary {
  background: var(--button-secondary-background, #4e5058);
}

.awaytimer-popover-button.full {
  width: 100%;
}

.awaytimer-popover-input {
  min-width: 0;
  height: 34px;
  box-sizing: border-box;
  border: 1px solid var(--background-modifier-accent, rgba(255, 255, 255, 0.12));
  border-radius: 6px;
  padding: 0 9px;
  background: var(--input-background, #1e1f22);
  color: var(--text-normal, #dbdee1);
  font: inherit;
  font-size: 13px;
}

.awaytimer-native-menu-group {
  display: contents;
}

.awaytimer-native-menu-item {
  cursor: pointer;
}

.awaytimer-hidden-native-menu-item {
  display: none !important;
}
`;
