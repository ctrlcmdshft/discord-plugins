module.exports = `
.cc-root {
  position: fixed;
  inset: 0;
  z-index: 10000;
  font-family: var(--font-primary, "gg sans", "Helvetica Neue", Helvetica, Arial, sans-serif);
}

.cc-root[hidden] {
  display: none;
}

.cc-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.42);
}

.cc-palette {
  position: absolute;
  top: 11vh;
  left: 50%;
  width: min(720px, calc(100vw - 32px));
  transform: translateX(-50%);
  background: var(--background-floating, #111214);
  border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.12));
  border-radius: 8px;
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.48);
  color: var(--text-normal, #dbdee1);
  overflow: hidden;
}

.cc-search-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 18px;
  border-bottom: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
}

.cc-search-icon {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  color: var(--interactive-normal, #b5bac1);
  border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.16));
  border-radius: 6px;
  font-size: 15px;
}

.cc-search-input {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--text-normal, #dbdee1);
  font: inherit;
  font-size: 18px;
  line-height: 24px;
}

.cc-search-input::placeholder {
  color: var(--text-muted, #80848e);
}

.cc-results {
  max-height: min(520px, 58vh);
  overflow-y: auto;
  padding: 8px;
}

.cc-result {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 58px;
  padding: 10px 12px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.cc-result.is-selected,
.cc-result:hover {
  background: var(--background-modifier-selected, rgba(88, 101, 242, 0.18));
}

.cc-result + .cc-result {
  margin-top: 2px;
}

.cc-result-main {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.cc-result-title,
.cc-result-subtitle,
.cc-result-category {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cc-result-title {
  color: var(--text-normal, #f2f3f5);
  font-size: 15px;
  font-weight: 600;
}

.cc-result-subtitle,
.cc-result-category,
.cc-footer {
  color: var(--text-muted, #949ba4);
  font-size: 12px;
}

.cc-result-category {
  max-width: 150px;
}

.cc-empty {
  padding: 34px 16px;
  color: var(--text-muted, #949ba4);
  text-align: center;
}

.cc-footer {
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  padding: 10px 14px 12px;
  border-top: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
}
`;
