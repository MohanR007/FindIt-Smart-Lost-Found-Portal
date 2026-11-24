// Smart Matching Algorithm for FindIt – Smart Lost & Found Portal
// Transparent rule-based weighted matching between lost and found catalog listings.
// Weights: Category (30%), Title (25%), Description (25%), Location (15%), Date Proximity (5%)

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'this', 'that', 'item', 'lost', 'found',
  'into', 'over', 'under', 'near', 'some', 'any', 'please', 'help', 'have', 'has',
  'had', 'were', 'been', 'which', 'what', 'when', 'where', 'about', 'just', 'left',
  'around', 'also', 'their', 'there', 'they', 'very', 'more', 'only'
]);

const CAMPUS_ZONES = [
  'library', 'food court', 'canteen', 'admin block', 'block 2', 'cse', 'ise',
  'mechanical', 'sports complex', 'hostel', 'grounds', 'heritage building',
  'metro', 'banashankari', 'kumaraswamy', 'jayanagar', 'koramangala', 'jp nagar'
];

/**
 * Tokenizes text into lowercase normalized keywords (length >= 2, non-stop words).
 */
export function tokenize(text) {
  if (!text || typeof text !== 'string') return [];
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w));
}

/**
 * 1. Category Similarity (30% weight)
 */
export function scoreCategory(catA, catB) {
  if (!catA || !catB) return { score: 0, reason: null };
  const a = String(catA).trim().toLowerCase();
  const b = String(catB).trim().toLowerCase();
  if (a === b) {
    return { score: 30, reason: `Exact Category Match (${catB})` };
  }
  if (a.includes(b) || b.includes(a)) {
    return { score: 20, reason: `Compatible Category (${catA} ~ ${catB})` };
  }
  return { score: 0, reason: null };
}

/**
 * 2. Item Name Similarity (25% weight)
 */
export function scoreName(nameA, nameB) {
  if (!nameA || !nameB) return { score: 0, reason: null };
  const a = String(nameA).trim().toLowerCase();
  const b = String(nameB).trim().toLowerCase();

  if (a === b) {
    return { score: 25, reason: `Exact Title Match ("${nameB}")` };
  }
  if (a.includes(b) || b.includes(a)) {
    const shorter = a.length < b.length ? nameA : nameB;
    return { score: 22, reason: `Title Substring Overlap ("${shorter}")` };
  }

  const tokensA = tokenize(a);
  const tokensB = tokenize(b);
  const shared = tokensA.filter((t) => tokensB.includes(t));

  if (shared.length > 0) {
    const union = new Set([...tokensA, ...tokensB]).size;
    const jaccard = shared.length / Math.max(union, 1);
    const score = Math.min(25, Math.max(10, Math.round(jaccard * 20 + shared.length * 4)));
    return {
      score,
      reason: `Matching Title Keywords: ${shared.slice(0, 3).join(', ')}`,
    };
  }

  return { score: 0, reason: null };
}

/**
 * 3. Description & Tags Similarity (25% weight)
 */
export function scoreDescription(descA, tagsA, descB, tagsB, nameA, nameB) {
  const textA = `${descA || ''} ${(Array.isArray(tagsA) ? tagsA.join(' ') : tagsA || '')}`;
  const textB = `${descB || ''} ${(Array.isArray(tagsB) ? tagsB.join(' ') : tagsB || '')}`;
  const tokensA = tokenize(textA);
  const tokensB = tokenize(textB);

  if (tokensA.length === 0 || tokensB.length === 0) {
    return { score: 0, reason: null };
  }

  const titleTokensA = tokenize(nameA);
  const titleTokensB = tokenize(nameB);

  const shared = Array.from(new Set([
    ...tokensA.filter((t) => tokensB.includes(t)),
    ...titleTokensA.filter((t) => tokensB.includes(t)),
    ...titleTokensB.filter((t) => tokensA.includes(t)),
  ]));

  if (shared.length >= 4) {
    return { score: 25, reason: `Multiple Descriptors Match: ${shared.slice(0, 4).join(', ')}` };
  }
  if (shared.length === 3) {
    return { score: 20, reason: `Matching Descriptors: ${shared.slice(0, 3).join(', ')}` };
  }
  if (shared.length === 2) {
    return { score: 15, reason: `Shared Key Features: ${shared.slice(0, 2).join(', ')}` };
  }
  if (shared.length === 1) {
    return { score: 10, reason: `Shared Keyword Feature: "${shared[0]}"` };
  }

  return { score: 0, reason: null };
}

/**
 * 4. Location Similarity (15% weight)
 */
export function scoreLocation(locA, locB) {
  if (!locA || !locB) return { score: 0, reason: null };
  const a = String(locA).trim().toLowerCase();
  const b = String(locB).trim().toLowerCase();

  if (a === b) {
    return { score: 15, reason: `Same Location (${locB})` };
  }
  if (a.includes(b) || b.includes(a)) {
    return { score: 12, reason: `Coincident Location Zone (${locB})` };
  }

  const matchedZone = CAMPUS_ZONES.find((z) => a.includes(z) && b.includes(z));
  if (matchedZone) {
    return { score: 10, reason: `Same Campus Landmark (${matchedZone.toUpperCase()})` };
  }

  if ((a.includes('dsce') || a.includes('campus')) && (b.includes('dsce') || b.includes('campus'))) {
    return { score: 5, reason: 'Shared Campus Vicinity' };
  }

  return { score: 0, reason: null };
}

/**
 * 5. Date Proximity (5% weight)
 */
export function scoreDate(dateA, dateB) {
  if (!dateA || !dateB) return { score: 0, reason: null };
  const dA = new Date(dateA);
  const dB = new Date(dateB);

  if (isNaN(dA.getTime()) || isNaN(dB.getTime())) {
    return { score: 0, reason: null };
  }

  const diffMs = Math.abs(dB.getTime() - dA.getTime());
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return { score: 5, reason: 'Incident Occurred on Same Date' };
  }
  if (diffDays <= 2) {
    return { score: 4, reason: `Temporal Proximity (${diffDays} day${diffDays > 1 ? 's' : ''})` };
  }
  if (diffDays <= 7) {
    return { score: 3, reason: `Temporal Proximity (${diffDays} days)` };
  }
  if (diffDays <= 14) {
    return { score: 2, reason: 'Temporal Proximity (within 2 weeks)' };
  }
  if (diffDays <= 30) {
    return { score: 1, reason: 'Temporal Proximity (within 1 month)' };
  }

  return { score: 0, reason: null };
}

/**
 * Calculate the weighted match score between a lost item and a found item.
 * Total possible: 100%.
 */
export function calculateMatchScore(lostItem, foundItem) {
  if (!lostItem || !foundItem) {
    return { score: 0, reasons: [], breakdown: {} };
  }

  const cat = scoreCategory(lostItem.category, foundItem.category);
  const name = scoreName(lostItem.name, foundItem.name);
  const desc = scoreDescription(
    lostItem.description,
    lostItem.tags,
    foundItem.description,
    foundItem.tags,
    lostItem.name,
    foundItem.name
  );
  const loc = scoreLocation(lostItem.location, foundItem.location);
  const date = scoreDate(lostItem.date || lostItem.createdAt, foundItem.date || foundItem.createdAt);

  const rawScore = cat.score + name.score + desc.score + loc.score + date.score;
  const score = Math.min(100, Math.max(0, Math.round(rawScore)));

  const factors = [
    { name: 'category', ...cat },
    { name: 'name', ...name },
    { name: 'description', ...desc },
    { name: 'location', ...loc },
    { name: 'date', ...date },
  ]
    .filter((f) => f.score > 0 && f.reason)
    .sort((a, b) => b.score - a.score);

  const reasons = factors.map((f) => f.reason);

  return {
    score,
    reasons,
    breakdown: {
      category: cat.score,
      name: name.score,
      description: desc.score,
      location: loc.score,
      date: date.score,
    },
  };
}

/**
 * Generate all eligible live matches from catalog items.
 * Compares lost reports against found reports.
 * Excludes returned and resolved items.
 */
export function findLiveMatches(items, options = {}) {
  const { minScore = 35, userId = null, myReportsOnly = false } = options;

  if (!Array.isArray(items) || items.length < 2) {
    return [];
  }

  // Filter out sealed or closed items
  const eligible = items.filter((item) => {
    if (!item || typeof item !== 'object') return false;
    const st = String(item.status || '').toLowerCase();
    return st !== 'returned' && st !== 'resolved';
  });

  const lostItems = eligible.filter((i) => String(i.type || '').toLowerCase() === 'lost');
  const foundItems = eligible.filter((i) => String(i.type || '').toLowerCase() === 'found');

  const matches = [];

  for (const lost of lostItems) {
    for (const found of foundItems) {
      if (lost.id === found.id) continue;
      // Do not match if the same user reported both
      if (lost.reportedBy && found.reportedBy && lost.reportedBy === found.reportedBy) {
        continue;
      }

      // User scoping if requested
      if (myReportsOnly && userId) {
        const isUserLost = lost.reportedBy === userId;
        const isUserFound = found.reportedBy === userId;
        if (!isUserLost && !isUserFound) continue;
      }

      const { score, reasons, breakdown } = calculateMatchScore(lost, found);

      if (score >= minScore) {
        const idA = String(lost.id || 'lost').replace(/^item-/, '');
        const idB = String(found.id || 'found').replace(/^item-/, '');
        matches.push({
          id: `match-${idA.slice(0, 8)}-${idB.slice(0, 8)}`,
          lostItemId: lost.id,
          foundItemId: found.id,
          lostItem: lost,
          foundItem: found,
          matchScore: score,
          reasons: reasons.length > 0 ? reasons : ['Algorithmic category and attribute overlap'],
          breakdown,
        });
      }
    }
  }

  matches.sort((a, b) => b.matchScore - a.matchScore);
  return matches;
}

