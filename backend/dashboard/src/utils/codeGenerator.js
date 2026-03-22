const DIGITS = "0123456789";

const randomChunk = (size = 6) => {
  let out = "";
  for (let i = 0; i < size; i += 1) {
    const idx = Math.floor(Math.random() * DIGITS.length);
    out += DIGITS[idx];
  }
  return out;
};

/**
 * HUMAN-READABLE ID GENERATOR: generateUniqueCode
 * Creates unique, branded IDs like USR-123456 or COM-987654.
 * 
 * Logic:
 * 1. Generates a random numeric chunk.
 * 2. Checks against the database to avoid collisions.
 * 3. Returns the unique ID for the specific model and field.
 * 
 * Important: This depends on a unique index in MongoDB for ultimate safety.
 */
const generateUniqueCode = async (
  model,
  field,
  prefix,
  size = 6,
  maxAttempts = 20,
) => {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const candidate = `${prefix}-${randomChunk(size)}`;
    
    // Check if the generated code is already taken in the provided database model.
    // eslint-disable-next-line no-await-in-loop
    const exists = await model.exists({ [field]: candidate });
    
    if (!exists) {
      return candidate;
    }
  }

  throw new Error(`Critical Error: Unable to generate a unique ${field} after ${maxAttempts} attempts.`);
};

module.exports = {
  generateUniqueCode,
};
