module.exports = `
.awaytimer-native-menu-group {
  display: contents;
}

.awaytimer-native-menu-item {
  cursor: pointer;
}

.awaytimer-active-timer {
  color: var(--text-muted, inherit) !important;
  cursor: default;
}

.awaytimer-parent-subtitle {
  color: var(--text-muted, #6d6f78);
  font-size: 12px;
  font-weight: 500;
  line-height: 16px;
  margin-top: 1px;
  pointer-events: none;
}

.awaytimer-hidden-native-menu-item {
  display: none !important;
}
`;
