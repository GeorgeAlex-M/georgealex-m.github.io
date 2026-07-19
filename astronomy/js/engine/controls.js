// DOM control factories. Controls live OUTSIDE the canvas in a .sim-controls
// div (styled by doodle.css) so they are accessible and mobile-friendly.

// A labelled slider. With log: true the range maps exponentially min→max.
// Returns { get value, set(v), el } — set() updates display without firing oninput.
export function slider(parent, {
  label,
  min,
  max,
  step = 'any',
  value,
  log = false,
  format = (v) => String(v),
  oninput = () => {},
}) {
  const wrap = document.createElement('div');
  wrap.className = 'ctl';
  const lab = document.createElement('label');
  const val = document.createElement('span');
  val.className = 'val';
  lab.append(label, ' ', val);
  const input = document.createElement('input');
  input.type = 'range';

  const toSlider = (v) => (log ? (Math.log(v) - Math.log(min)) / (Math.log(max) - Math.log(min)) : v);
  const fromSlider = (t) => (log ? Math.exp(Math.log(min) + t * (Math.log(max) - Math.log(min))) : t);

  if (log) {
    input.min = 0;
    input.max = 1;
    input.step = 0.001;
  } else {
    input.min = min;
    input.max = max;
    input.step = step;
  }

  let current = value;
  const show = () => { val.textContent = format(current); };

  input.addEventListener('input', () => {
    current = fromSlider(parseFloat(input.value));
    show();
    oninput(current);
  });

  wrap.append(lab, input);
  parent.appendChild(wrap);

  const api = {
    get value() { return current; },
    set(v) {
      current = v;
      input.value = String(toSlider(v));
      show();
    },
    el: wrap,
  };
  api.set(value);
  return api;
}

// A row of radio-style buttons (one active at a time).
// defs: [{ label, value }]; onSelect(value) fires on click.
// Returns { select(value), el }.
export function buttonRow(parent, defs, { initial, onSelect = () => {} } = {}) {
  const row = document.createElement('div');
  row.className = 'ctl-buttons';
  const btns = new Map();
  defs.forEach((d) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'doodle-btn';
    b.textContent = d.label;
    b.addEventListener('click', () => {
      api.select(d.value);
      onSelect(d.value);
    });
    btns.set(d.value, b);
    row.appendChild(b);
  });
  parent.appendChild(row);
  const api = {
    select(value) {
      btns.forEach((b, v) => b.classList.toggle('active', v === value));
    },
    el: row,
  };
  if (initial !== undefined) api.select(initial);
  return api;
}

// A single action button.
export function actionButton(parent, text, onclick) {
  let row = parent.querySelector(':scope > .ctl-buttons.actions');
  if (!row) {
    row = document.createElement('div');
    row.className = 'ctl-buttons actions';
    parent.appendChild(row);
  }
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'doodle-btn';
  b.textContent = text;
  b.addEventListener('click', onclick);
  row.appendChild(b);
  return b;
}

// Readout helper: builds colored spans inside the .sim-readout div.
// lines: array of arrays of [text, colorClass] pairs, one array per line.
export function setReadout(el, lines) {
  if (!el) return;
  el.innerHTML = lines
    .map((parts) => parts
      .map(([text, cls]) => (cls ? `<span class="r-${cls}">${text}</span>` : text))
      .join(''))
    .join('<br>');
}
