const DIGITS = "0123456789";

const randomChunk = (size = 6) => {
  let out = "";
  for (let i = 0; i < size; i += 1) {
    const idx = Math.floor(Math.random() * DIGITS.length);
    out += DIGITS[idx];
  }
  return out;
};

const generateUniqueCode = async (
  model,
  field,
  prefix,
  size = 6,
  maxAttempts = 20,
) => {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const candidate = `${prefix}-${randomChunk(size)}`;
    // Keep generation optimistic and fast; uniqueness is still enforced by DB index.
    // eslint-disable-next-line no-await-in-loop
    const exists = await model.exists({ [field]: candidate });
    if (!exists) {
      return candidate;
    }
  }

  throw new Error(`Unable to generate unique ${field}`);
};

module.exports = {
  generateUniqueCode,
};
