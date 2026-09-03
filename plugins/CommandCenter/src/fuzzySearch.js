function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function scoreMatch(query, candidate) {
  const needle = normalize(query);
  const haystack = normalize(candidate);

  if (!needle) return {matched: true, score: 0, indexes: []};
  if (!haystack) return {matched: false, score: Number.NEGATIVE_INFINITY, indexes: []};
  if (haystack === needle) return {matched: true, score: 1000, indexes: range(0, haystack.length)};
  if (haystack.startsWith(needle)) return {matched: true, score: 800 - haystack.length, indexes: range(0, needle.length)};

  let score = 0;
  let lastIndex = -1;
  const indexes = [];

  for (const char of needle) {
    const index = haystack.indexOf(char, lastIndex + 1);
    if (index === -1) return {matched: false, score: Number.NEGATIVE_INFINITY, indexes: []};

    indexes.push(index);
    score += 20;
    if (index === lastIndex + 1) score += 15;
    if (index === 0 || /[\s#:_/-]/.test(haystack[index - 1])) score += 10;
    score -= Math.max(0, index - lastIndex - 1);
    lastIndex = index;
  }

  return {matched: true, score: score - haystack.length * 0.1, indexes};
}

function range(start, end) {
  return Array.from({length: end - start}, (_, offset) => start + offset);
}

function searchableText(command) {
  return [
    command.title,
    command.subtitle,
    command.category,
    ...(command.keywords || [])
  ].filter(Boolean).join(" ");
}

function fuzzySearch(query, commands, limit = 12) {
  const isBrowsing = !normalize(query);
  return commands
    .map((command) => {
      const result = scoreMatch(query, searchableText(command));
      return {...command, match: result};
    })
    .filter((command) => command.match.matched)
    .sort((first, second) => {
      if (isBrowsing) return (second.priority || 0) - (first.priority || 0) || first.category.localeCompare(second.category) || first.title.localeCompare(second.title);
      return second.match.score - first.match.score || (second.priority || 0) - (first.priority || 0) || first.title.localeCompare(second.title);
    })
    .slice(0, limit);
}

module.exports = {
  fuzzySearch,
  scoreMatch
};
