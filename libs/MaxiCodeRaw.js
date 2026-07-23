// Converts visible control-code notation into the exact byte characters that
// the MaxiCode encoder consumes. The ~ddd syntax is compatible with bcgen.

const NAMED_CONTROLS = Object.freeze({
  NUL: 0,
  EOT: 4,
  TAB: 9,
  LF: 10,
  CR: 13,
  ESC: 27,
  FS: 28,
  GS: 29,
  RS: 30,
});

export function parseMaxiCodeRawInput(source) {
  const input = String(source ?? '');
  let output = '';

  for (let index = 0; index < input.length;) {
    if (input.startsWith('~~', index)) {
      output += '~';
      index += 2;
      continue;
    }

    const decimalEscape = /^~(\d{3})/.exec(input.slice(index));
    if (decimalEscape) {
      const value = Number(decimalEscape[1]);
      if (value > 255) {
        throw new Error(`Raw control escape ${decimalEscape[0]} is outside the byte range 000-255.`);
      }
      output += String.fromCharCode(value);
      index += decimalEscape[0].length;
      continue;
    }

    const namedEscape = /^<([A-Za-z]+)>/.exec(input.slice(index));
    if (namedEscape) {
      const name = namedEscape[1].toUpperCase();
      if (Object.hasOwn(NAMED_CONTROLS, name)) {
        output += String.fromCharCode(NAMED_CONTROLS[name]);
        index += namedEscape[0].length;
        continue;
      }
    }

    output += input[index];
    index += 1;
  }

  return output;
}

