import { Product } from "../../../models/Product.js";

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "the",
  "or",
  "of",
  "to",
  "in",
  "on",
  "for",
  "by",
  "with",
  "is",
  "are",
  "was",
  "were",
  "this",
  "that",
  "those",
  "these"
]);

const SYNONYM_GROUPS = [
  ["phone", "mobile", "smartphone", "cellphone", "handset"],
  ["laptop", "notebook", "computer", "macbook", "ultrabook"],
  ["tv", "television", "smarttv", "smart-tv"],
  ["shoe", "shoes", "sneaker", "sneakers", "footwear"],
  ["dress", "gown", "apparel", "clothing", "outfit"],
  ["bag", "backpack", "handbag", "satchel", "tote"],
  ["watch", "timepiece", "smartwatch", "wristwatch"],
  ["earphone", "earphones", "earbud", "earbuds", "headphone", "headphones"],
  ["camera", "dslr", "mirrorless"],
  ["fridge", "refrigerator", "cooler"],
  ["ac", "airconditioner", "air-conditioner"],
  ["washer", "washingmachine", "laundry"]
];

const SYNONYM_LOOKUP = buildSynonymLookup(SYNONYM_GROUPS);
const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;
const PRIMARY_SCORE_MIN = 0.45;
const PRIMARY_SIMILARITY_MIN = 0.35;
const SECONDARY_SCORE_MIN = 0.15;
const SECONDARY_LIMIT = 10;

export const aiProductSearch = async (req, res) => {
  try {
    const {
      query,
      limit = DEFAULT_LIMIT,
      category,
      categories,
      brand,
      brands,
      price
    } = req.body || {};

    if (!query || typeof query !== "string" || !query.trim()) {
      return res.status(400).json({
        success: false,
        error: "Search query is required"
      });
    }

    const effectiveLimit = clampLimit(limit);
    const queryTokens = buildTokenSetFromParts(query);

    const candidateRegex = buildCandidateRegex(queryTokens, query);
    const candidateFilter = buildCandidateFilter({
      category,
      categories,
      brand,
      brands,
      price
    });

    const candidateProducts = await Product.find({
      ...candidateFilter,
      status: "active",
      isDeleted: false,
      $or: buildSearchableFields(candidateRegex)
    })
      .populate("brand", "name")
      .populate("category", "name")
      .populate("subCategory", "name")
      .lean()
      .limit(200);

    if (!candidateProducts.length) {
      return res.json({
        success: true,
        data: [],
        extras: [],
        metadata: {
          query,
          queryTokens: Array.from(queryTokens),
          requestedLimit: effectiveLimit,
          limit: effectiveLimit,
          secondaryLimit: Math.min(SECONDARY_LIMIT, effectiveLimit),
          totalCandidates: 0,
          totalRanked: 0,
          totalPrimary: 0,
          totalExtras: 0,
          returnedPrimary: 0,
          returnedExtras: 0
        }
      });
    }

    const rankedProducts = candidateProducts
      .map((product) => scoreProduct(product, queryTokens))
      .filter((item) => item.score >= SECONDARY_SCORE_MIN)
      .sort((a, b) => b.score - a.score);

    const { primary, extras } = partitionMatches(rankedProducts, {
      limit: effectiveLimit,
      secondaryLimit: SECONDARY_LIMIT
    });

    res.json({
      success: true,
      data: primary.items,
      extras: extras.items,
      metadata: {
        query,
        queryTokens: Array.from(queryTokens),
        requestedLimit: effectiveLimit,
        limit: primary.limit,
        secondaryLimit: extras.limit,
        totalCandidates: candidateProducts.length,
        totalRanked: rankedProducts.length,
        totalPrimary: primary.totalCount,
        totalExtras: extras.totalCount,
        returnedPrimary: primary.items.length,
        returnedExtras: extras.items.length
      }
    });
  } catch (error) {
    console.error("AI search error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to process the AI search",
      details: error.message
    });
  }
};

function scoreProduct(product, queryTokens) {
  const fieldTokens = buildProductTokenMap(product);
  const combinedTokens = new Set();
  fieldTokens.forEach((tokens) => {
    tokens.forEach((token) => combinedTokens.add(token));
  });

  const similarity = semanticSimilarity(queryTokens, combinedTokens);
  const boost = computeRelevanceBoost(queryTokens, product, fieldTokens);
  const score = similarity + boost;

  const matchSummary = buildMatchSummary(queryTokens, fieldTokens);

  return { product, similarity, boost, score, matchSummary };
}

function partitionMatches(rankedProducts, { limit, secondaryLimit }) {
  const safeLimit = Number.isFinite(limit) ? Math.max(0, limit) : DEFAULT_LIMIT;
  const safeSecondaryLimit = Number.isFinite(secondaryLimit)
    ? Math.max(0, secondaryLimit)
    : Math.min(SECONDARY_LIMIT, safeLimit || SECONDARY_LIMIT);

  const primary = [];
  const extras = [];

  rankedProducts.forEach((entry) => {
    const formatted = formatProductResult(entry);
    if (isPrimaryMatch(entry)) {
      primary.push(formatted);
    } else {
      extras.push(formatted);
    }
  });

  return {
    primary: {
      items: primary.slice(0, safeLimit),
      totalCount: primary.length,
      limit: safeLimit
    },
    extras: {
      items: extras.slice(0, safeSecondaryLimit),
      totalCount: extras.length,
      limit: safeSecondaryLimit
    }
  };
}

function formatProductResult({ product, score, similarity, matchSummary }) {
  return {
    _id: product._id,
    name: product.name,
    description: product.description,
    images: product.images,
    tags: product.tags,
    brand: product.brand || null,
    category: product.category || null,
    subCategory: product.subCategory || null,
    priceRange: buildPriceRange(product),
    similarity: Number(similarity.toFixed(3)),
    score: Number(score.toFixed(3)),
    matchSummary
  };
}

function isPrimaryMatch({ similarity, score, matchSummary, boost }) {
  const hasStrongField = matchSummary.some((field) =>
    ["name", "tags", "brand", "category", "variants"].includes(field)
  );
  if (similarity >= 0.65) {
    return true;
  }
  if (similarity >= PRIMARY_SIMILARITY_MIN && score >= PRIMARY_SCORE_MIN) {
    return true;
  }
  if (score >= PRIMARY_SCORE_MIN + 0.1) {
    return true;
  }
  if (hasStrongField && similarity >= PRIMARY_SIMILARITY_MIN * 0.9 && boost >= 0.1) {
    return true;
  }
  return false;
}

function buildCandidateFilter({ category, categories, brand, brands, price }) {
  const filter = {};
  const categoryFilter = collectIds(category, categories);
  const brandFilter = collectIds(brand, brands);

  if (categoryFilter) {
    filter.category = categoryFilter;
  }
  if (brandFilter) {
    filter.brand = brandFilter;
  }
  if (price && typeof price === "object") {
    const { min, max } = price;
    filter["variants.price"] = {};
    if (Number.isFinite(min)) {
      filter["variants.price"].$gte = Number(min);
    }
    if (Number.isFinite(max)) {
      filter["variants.price"].$lte = Number(max);
    }
    if (!Object.keys(filter["variants.price"]).length) {
      delete filter["variants.price"];
    }
  }

  return filter;
}

function collectIds(value, collection) {
  if (Array.isArray(collection)) {
    const cleaned = collection
      .map((entry) => (typeof entry === "string" ? entry.trim() : entry))
      .filter(Boolean);
    if (cleaned.length) {
      return { $in: cleaned };
    }
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
  if (value) {
    return value;
  }
  return null;
}

function buildSearchableFields(regex) {
  return [
    { name: regex },
    { description: regex },
    { tags: { $elemMatch: { $regex: regex } } },
    { sku: regex },
    { "variants.sku": regex },
    { "variants.attributes.value": regex },
    { "variants.attributes.type": regex }
  ];
}

function buildProductTokenMap(product) {
  const mapper = new Map();

  mapper.set("name", buildTokenSetFromParts(product.name));
  mapper.set("description", buildTokenSetFromParts(product.description));
  mapper.set("tags", buildTokenSetFromParts((product.tags || []).join(" ")));
  mapper.set("sku", buildTokenSetFromParts(product.sku));

  if (product.brand && product.brand.name) {
    mapper.set("brand", buildTokenSetFromParts(product.brand.name));
  }
  if (product.category && product.category.name) {
    mapper.set("category", buildTokenSetFromParts(product.category.name));
  }
  if (product.subCategory && product.subCategory.name) {
    mapper.set("subCategory", buildTokenSetFromParts(product.subCategory.name));
  }

  const variantTokens = new Set();
  (product.variants || []).forEach((variant) => {
    buildTokenSetFromParts(variant.sku).forEach((token) =>
      variantTokens.add(token)
    );
    (variant.attributes || []).forEach((attribute) => {
      buildTokenSetFromParts(attribute.type, attribute.value).forEach(
        (token) => variantTokens.add(token)
      );
    });
  });

  if (variantTokens.size) {
    mapper.set("variants", variantTokens);
  }

  return mapper;
}

function buildMatchSummary(queryTokens, fieldTokens) {
  const summary = [];
  fieldTokens.forEach((tokens, field) => {
    if (hasSemanticOverlap(queryTokens, tokens)) {
      summary.push(field);
    }
  });
  return summary;
}

function computeRelevanceBoost(queryTokens, product, fieldTokens) {
  let boost = 0;

  const tagTokens = fieldTokens.get("tags");
  if (tagTokens && hasSemanticOverlap(queryTokens, tagTokens)) {
    boost += 0.12;
  }

  const categoryTokens = fieldTokens.get("category");
  if (categoryTokens && hasSemanticOverlap(queryTokens, categoryTokens)) {
    boost += 0.08;
  }

  const brandTokens = fieldTokens.get("brand");
  if (brandTokens && hasSemanticOverlap(queryTokens, brandTokens)) {
    boost += 0.06;
  }

  const variantTokens = fieldTokens.get("variants");
  if (variantTokens) {
    const matches = countMatches(queryTokens, variantTokens);
    if (matches) {
      boost += Math.min(0.2, matches * 0.05);
    }
  }

  if (product.tags && product.tags.length && includesExactTag(queryTokens, product.tags)) {
    boost += 0.05;
  }

  return boost;
}

function includesExactTag(queryTokens, tags = []) {
  const lowerTags = tags.map((tag) => tag.toLowerCase());
  for (const token of queryTokens) {
    if (lowerTags.includes(token)) {
      return true;
    }
  }
  return false;
}

function buildPriceRange(product) {
  const variants = product.variants || [];
  if (variants.length) {
    const prices = variants
      .filter((variant) => Number.isFinite(variant.price))
      .map((variant) => Number(variant.price));
    if (prices.length) {
      return {
        min: Math.min(...prices),
        max: Math.max(...prices)
      };
    }
  }

  if (Number.isFinite(product.sellingPrice) && Number.isFinite(product.mrp)) {
    return {
      min: Number(product.sellingPrice),
      max: Number(product.mrp)
    };
  }

  if (Number.isFinite(product.sellingPrice)) {
    const price = Number(product.sellingPrice);
    return { min: price, max: price };
  }

  return null;
}

function buildCandidateRegex(tokens, fallback) {
  const baseTokens = Array.from(tokens).filter(Boolean);
  if (!baseTokens.length && fallback) {
    return new RegExp(escapeRegex(fallback.trim()), "i");
  }
  const pattern = baseTokens.map((token) => escapeRegex(token)).join("|");
  return new RegExp(pattern || escapeRegex(fallback || ""), "i");
}

function buildTokenSetFromParts(...parts) {
  const tokens = new Set();
  parts
    .flat()
    .filter(Boolean)
    .forEach((part) => {
      tokenize(part).forEach((token) => {
        expandToken(token).forEach((expanded) => {
          if (expanded) {
            tokens.add(expanded);
          }
        });
      });
    });
  return tokens;
}

function tokenize(value) {
  if (!value || typeof value !== "string") {
    return [];
  }
  return value
    .toString()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token && !STOP_WORDS.has(token));
}

function expandToken(token) {
  const expansions = new Set([token]);
  const stemmed = stemToken(token);
  if (stemmed && stemmed !== token) {
    expansions.add(stemmed);
  }
  const synonyms = SYNONYM_LOOKUP.get(token);
  if (synonyms) {
    synonyms.forEach((synonym) => expansions.add(synonym));
  }
  return expansions;
}

function stemToken(token) {
  if (token.length <= 3) {
    return token;
  }
  const suffixes = ["ing", "ers", "er", "ies", "ied", "s"];
  for (const suffix of suffixes) {
    if (token.endsWith(suffix)) {
      const stem = token.slice(0, -suffix.length);
      if (stem.length >= 3) {
        return stem;
      }
    }
  }
  return token;
}

function buildSynonymLookup(groups) {
  const lookup = new Map();
  groups.forEach((group) => {
    group.forEach((word) => {
      const siblings = group.filter((candidate) => candidate !== word);
      if (lookup.has(word)) {
        const existing = lookup.get(word);
        siblings.forEach((item) => existing.add(item));
      } else {
        lookup.set(word, new Set(siblings));
      }
    });
  });
  return lookup;
}

function hasSemanticOverlap(queryTokens, documentTokens) {
  for (const queryToken of queryTokens) {
    for (const documentToken of documentTokens) {
      if (tokenSimilarity(queryToken, documentToken) >= 0.75) {
        return true;
      }
    }
  }
  return false;
}

function countMatches(queryTokens, documentTokens) {
  let matches = 0;
  queryTokens.forEach((queryToken) => {
    documentTokens.forEach((documentToken) => {
      if (tokenSimilarity(queryToken, documentToken) >= 0.8) {
        matches += 1;
      }
    });
  });
  return matches;
}

function semanticSimilarity(queryTokens, documentTokens) {
  if (!queryTokens.size || !documentTokens.size) {
    return 0;
  }
  let total = 0;
  queryTokens.forEach((queryToken) => {
    let best = 0;
    documentTokens.forEach((documentToken) => {
      const score = tokenSimilarity(queryToken, documentToken);
      if (score > best) {
        best = score;
      }
    });
    total += best;
  });
  return total / queryTokens.size;
}

function tokenSimilarity(a, b) {
  if (a === b) {
    return 1;
  }
  if (!a || !b) {
    return 0;
  }
  if (a.length > 3 && b.includes(a)) {
    return 0.85;
  }
  if (b.length > 3 && a.includes(b)) {
    return 0.75;
  }
  const distance = levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length);
  if (!maxLen) {
    return 0;
  }
  const similarity = 1 - distance / maxLen;
  return similarity > 0.4 ? similarity : 0;
}

function levenshtein(a, b) {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const matrix = Array.from({ length: rows }, () => new Array(cols).fill(0));

  for (let i = 0; i < rows; i += 1) {
    matrix[i][0] = i;
  }
  for (let j = 0; j < cols; j += 1) {
    matrix[0][j] = j;
  }

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[a.length][b.length];
}

function clampLimit(value) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return DEFAULT_LIMIT;
  }
  return Math.min(parsed, MAX_LIMIT);
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
