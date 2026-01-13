// Test the placeholder logic
function extractPlaceholders(text) {
  const placeholderRegex = /\{\{([^}]+)\}\}/g;
  const seen = new Set();
  const specs = [];

  let match;
  while ((match = placeholderRegex.exec(text)) !== null) {
    const content = match[1].trim();

    // Skip if already processed
    if (seen.has(content)) continue;
    seen.add(content);

    const spec = parsePlaceholder(content);
    if (spec) {
      specs.push(spec);
    }
  }

  return specs;
}

function parsePlaceholder(content) {
  // Date placeholder: {{date:today}}
  if (content.startsWith('date:')) {
    const label = content.substring(5).trim();
    if (!label) return null;

    return {
      key: content,
      type: 'date',
      label,
      defaultValue: label === 'today' ? '2025-12-22' : undefined,
      original: content,
    };
  }

  // Select placeholder: {{key:option1|option2|option3}}
  const colonIndex = content.indexOf(':');
  if (colonIndex > 0) {
    const key = content.substring(0, colonIndex).trim();
    const optionsPart = content.substring(colonIndex + 1).trim();

    if (key && optionsPart) {
      const options = optionsPart.split('|').map(opt => opt.trim()).filter(opt => opt);
      if (options.length > 0) {
        return {
          key,
          type: 'select',
          label: key,
          options,
          original: content,
        };
      }
    }
  }

  // Text placeholder with default: {{key=default}}
  const equalsIndex = content.indexOf('=');
  if (equalsIndex > 0) {
    const key = content.substring(0, equalsIndex).trim();
    const defaultValue = content.substring(equalsIndex + 1).trim();

    if (key) {
      return {
        key,
        type: 'text',
        label: key,
        defaultValue,
        original: content,
      };
    }
  }

  // Simple text placeholder: {{key}}
  const key = content.trim();
  if (key) {
    return {
      key,
      type: 'text',
      label: key,
      original: content,
    };
  }

  return null;
}

function applyPlaceholders(text, values, specs) {
  let result = text;

  for (const spec of specs) {
    const value = values[spec.key];
    if (value !== undefined) {
      // Escape special regex characters in the original placeholder for replacement
      const escapedOriginal = spec.original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\{\\{${escapedOriginal}\\}\\}`, 'g');
      result = result.replace(regex, value);
    }
  }

  return result;
}

// Test with the user's example
const text = '{{date:today}} FROM {{temp:a|c|r}} WITH {{x=test}} LIMIT {{r}}';
console.log('Original text:', text);

const specs = extractPlaceholders(text);
console.log('Extracted specs:', JSON.stringify(specs, null, 2));

const values = { 'date:today': '2025-12-22', temp: 'c', x: 'test', r: '34' };
console.log('Values to substitute:', values);

const result = applyPlaceholders(text, values, specs);
console.log('Result:', result);
