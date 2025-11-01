function renderTemplate(template, ctx) {
  if (!template) return '';
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => {
    if (key === 'state') return JSON.stringify(ctx.state.snapshot());
    if (Object.prototype.hasOwnProperty.call(ctx, key)) {
      const value = ctx[key];
      return value === undefined ? '' : String(value);
    }
    if (ctx.extra && Object.prototype.hasOwnProperty.call(ctx.extra, key)) {
      const value = ctx.extra[key];
      return value === undefined ? '' : String(value);
    }
    return '';
  });
}

function clampValue(value, clamp = {}) {
  let result = value;
  if (typeof clamp.min === 'number') result = Math.max(clamp.min, result);
  if (typeof clamp.max === 'number') result = Math.min(clamp.max, result);
  return result;
}

function parseValue(source, action) {
  const input = String(source);
  switch (action.type) {
    case 'float': {
      const parsed = Number.parseFloat(input);
      if (Number.isNaN(parsed)) throw new Error(`parse(float) failed for value "${input}"`);
      return clampValue(parsed, action.clamp);
    }
    case 'int': {
      const parsed = Number.parseInt(input, 10);
      if (Number.isNaN(parsed)) throw new Error(`parse(int) failed for value "${input}"`);
      return clampValue(parsed, action.clamp);
    }
    default:
      throw new Error(`Unsupported parse type: ${action.type}`);
  }
}

function runActions(actions = [], context) {
  for (const action of actions) {
    switch (action.action) {
      case 'log': {
        const message = renderTemplate(action.template || '', {
          ...context,
          extra: action.extra || {},
        });
        if (message) console.log(message);
        break;
      }
      case 'parse': {
        const sourceValue = action.from === 'parsed' ? context.parsed : context.value;
        const parsed = parseValue(sourceValue, action);
        context.parsed = parsed;
        if (action.target === 'state') {
          if (!action.key) throw new Error('parse action requires "key" when target is "state"');
          context.state.set(action.key, parsed);
        } else if (action.target === 'context') {
          context.value = parsed;
        }
        break;
      }
      default:
        throw new Error(`Unsupported action type: ${action.action}`);
    }
  }
}

module.exports = {
  runActions,
};
