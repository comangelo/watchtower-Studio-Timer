/**
 * Análisis del PDF del artículo de estudio de La Atalaya, hecho en el navegador.
 *
 * Es una traducción fiel del análisis que antes hacía el servidor en Python
 * (backend/server.py → analyze_pdf_with_font_info_configurable). Usa pdf.js para leer
 * el texto con su tamaño de letra y las líneas dibujadas del PDF.
 *
 * Reglas principales (tamaños en puntos):
 *  - Texto de párrafo: 10,5–11,5        - Número de párrafo: 6–7,5
 *  - Preguntas: 8,5–9,5, empiezan con "N." o "N, M." (párrafos agrupados)
 *  - Preguntas de repaso: lo que va debajo de la línea horizontal final (o tras
 *    "¿QUÉ RESPONDERÍAS?")
 *  - 40 s extra por cada imagen, texto bíblico o nota.
 *
 * El módulo no depende de React: recibe el documento de pdf.js ya abierto, así que
 * también se puede ejecutar en Node para las pruebas.
 */

export const WORDS_PER_MINUTE = 180;
export const QUESTION_ANSWER_TIME = 35;
const EXTRA_CONTENT_TIME = 40;

/* ------------------------------------------------------------------ */
/* Utilidades de texto (equivalentes a las de Python)                  */
/* ------------------------------------------------------------------ */

// Python: re.findall(r'\b\w+\b', text) con \w Unicode
export const countWords = (text) => (text.match(/[\p{L}\p{N}_]+/gu) || []).length;

export const calculateReadingTime = (wordCount, wpm = WORDS_PER_MINUTE) => (wordCount / wpm) * 60;

// Redondeo a 2 decimales como round(x, 2)
const round2 = (x) => Math.round((x + Number.EPSILON) * 100) / 100;

const isDigits = (s) => /^\d+$/.test(s);
const isUpperText = (s) => s === s.toUpperCase() && s !== s.toLowerCase();
const isUpperChar = (c) => !!c && c === c.toUpperCase() && c !== c.toLowerCase();

// "ima- gen" -> "imagen"
export const cleanHyphenatedText = (text) => text.replace(/-\s+([a-záéíóúñ])/g, '$1');

/** Verbo de lectura al inicio: "lea", "léalo", "lee", "léelo", "lean", "léanlo" (forma de usted y de tú). */
export const READ_VERB = '[Ll][EeÉé](?:[Aa]|[Ee])[Nn]?(?:[Ll][Oo][Ss]?)?';
const READ_PREFIX = new RegExp('^' + READ_VERB + '\\s+', 'u');
/** "Efesios 6: 11, 12" (cita partida entre dos líneas) -> "Efesios 6:11, 12" */
export const joinVerseColon = (text) => text.replace(/(\d+):\s+(\d+)/g, '$1:$2');
// Cita bíblica: "Santiago 3:14-16", "1 Sam. 18:9-11", "Mat. 5:43, 44"
// Libros de un solo capítulo: sus citas no llevan "capítulo:" ("Filemón 8, 9, 17", "Judas 3")
const SINGLE_CHAPTER = '(?:Abd[ií]as|Abd\\.|Filem[oó]n|Filem\\.|Flm\\.|[23]\\s?Juan|[23]\\s?Jn\\.|Judas|Jud\\.)';
const SINGLE_CHAPTER_REF = new RegExp(SINGLE_CHAPTER + '\\s+\\d+(?:\\s?[-–,]\\s?\\d+)*', 'u');
const BIBLE_REF = new RegExp(
  '(?:[1-3]\\s?)?[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+\\.?\\s+\\d+:\\d+(?:\\s?[-–,]\\s?\\d+(?::\\d+)?)*'
  + '|' + SINGLE_CHAPTER + '\\s+\\d+(?:\\s?[-–,]\\s?\\d+)*(?![\\d:])',
  'gu');
// Tras "lee/lea": nombre de libro + número basta ("lee Filemón 10-12", "lea Judas 3")
const READ_BOOK_REF = /^(?:[1-3]\s?)?[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+\.?\s+\d+/u;

export function joinHyphenatedLines(parts) {
  const result = [];
  for (let part of parts) {
    part = part.trim();
    if (!part) continue;
    if (result.length && result[result.length - 1].endsWith('-')) {
      result[result.length - 1] = result[result.length - 1].slice(0, -1) + part;
    } else {
      result.push(part);
    }
  }
  return result.join(' ');
}

/**
 * Une las líneas de un párrafo como en la revista impresa:
 *  - "Sa-" + "tanás"   -> "Satanás"   (palabra partida al final de la línea)
 *  - "18:9-" + "11"    -> "18:9-11"   (guion de un rango: se conserva, sin espacio)
 *  - resto             -> separado por un espacio
 */
export function joinParagraphLines(lines) {
  let out = '';
  for (let line of lines) {
    line = line.trim();
    if (!line) continue;
    if (!out) { out = line; continue; }
    if (/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]-$/u.test(out) && /^[a-záéíóúüñ]/u.test(line)) out = out.slice(0, -1) + line;
    else if (/[-:]$/.test(out) && /^\d/.test(line)) out += line;
    else out += ' ' + line;
  }
  return out;
}

/** Clasifica el contenido entre paréntesis: image | scripture | note | both | "" */
export function classifyParenthesisContent(paren) {
  const VERB = '(?:vea|mira|mire|observe|observa)';
  const hasNote = new RegExp(VERB + '\\s*(también\\s+)?la\\s+nota', 'iu').test(paren);

  let hasImage = false;
  if (!hasNote) {
    hasImage = new RegExp(VERB + '\\s*(también\\s+)?(la\\s+|las\\s+)?(im[aá]gen(es)?|ilustraci[oó]n(es)?)', 'iu').test(paren);
    if (!hasImage) hasImage = /^(im[aá]gen(es)?|ilustraci[oó]n(es)?)$/iu.test(paren.trim());
    if (!hasImage) hasImage = new RegExp('^' + VERB + '\\s+también\\s*$', 'iu').test(paren.trim());
  }

  let hasScripture = false;
  paren = joinVerseColon(paren);
  if (READ_PREFIX.test(paren)) {
    const part = paren.replace(READ_PREFIX, '');
    if (/\d+:\d+/.test(part) || READ_BOOK_REF.test(part)) hasScripture = true;
  }
  if (!hasScripture) hasScripture = /[A-Za-záéíóúÁÉÍÓÚñÑ]+\s+\d+:\d+/u.test(paren);
  if (!hasScripture) hasScripture = /[A-Za-záéíóúÁÉÍÓÚñÑ]+\d+:\d+/u.test(paren);
  if (!hasScripture) hasScripture = SINGLE_CHAPTER_REF.test(paren);

  if (hasNote) return 'note';
  if (hasImage && hasScripture) return 'both';
  if (hasImage) return 'image';
  if (hasScripture) return 'scripture';
  return '';
}

export function extractQuestionWithParenthesis(questionText) {
  questionText = cleanHyphenatedText(questionText);
  const result = { text: questionText.trim(), parenthesis_content: '', content_type: '' };

  const m = /\?\s*\(([^)]+)\)/u.exec(questionText);
  if (m) {
    const paren = m[1].trim();
    result.parenthesis_content = paren;
    result.text = questionText.slice(0, m.index + 1).trim();
    result.content_type = classifyParenthesisContent(paren);
  } else {
    const any = /\(([^)]+)\)/u.exec(questionText);
    if (any) {
      const paren = any[1].trim();
      if (paren.length > 3) {
        result.parenthesis_content = paren;
        result.text = questionText.split(`(${paren})`).join('').trim();
        result.content_type = classifyParenthesisContent(paren);
      }
    }
  }
  return result;
}

// Cita bíblica dentro del propio texto de la pregunta ("Según Mateo 5:43, 44, ¿…?")
const SCRIPTURE_IN_TEXT_CV = /[A-Za-záéíóúÁÉÍÓÚñÑ]+\.?\s+\d+:\d+/u;
const SCRIPTURE_IN_TEXT = { test: (t) => SCRIPTURE_IN_TEXT_CV.test(t) || SINGLE_CHAPTER_REF.test(t) };

export function createQuestionInfo(questionText, answerTime, isFinal = false) {
  const e = extractQuestionWithParenthesis(questionText);
  if (SCRIPTURE_IN_TEXT.test(e.text)) {
    if (e.content_type === '') e.content_type = 'scripture';
    else if (e.content_type === 'image') e.content_type = 'both';
  }
  return {
    text: e.text,
    answer_time: answerTime,
    is_final_question: isFinal,
    parenthesis_content: e.parenthesis_content,
    content_type: e.content_type,
  };
}

/** Separa varias preguntas de una misma línea; acepta preguntas sin "¿?" ("Mencione…"). */
export function extractMultipleQuestions(text) {
  const questions = [];
  // Incluye lo que va antes del "¿" ("Según Mateo 5:43, 44, ¿cómo…?")
  const re = /[^?¿]*¿[^?]+\?\s*(?:\([^)]+\))?|[^?¿]+\?\s*(?:\([^)]+\))?/gu;
  for (const m of text.matchAll(re)) {
    const part = m[0].trim();
    if (part && part.length > 3) questions.push(part);
  }
  if (!questions.length && text.trim().includes('?')) questions.push(text.trim());
  if (!questions.length) {
    const whole = text.replace(/\s+/g, ' ').trim();
    if ((whole.match(/[\p{L}\p{N}_]+/gu) || []).length >= 3) questions.push(whole);
  }
  return questions;
}

/**
 * "Ideas importantes": textos entre comillas dentro del paréntesis de una pregunta,
 * p. ej. (Vea también el recuadro "Lo que aprendemos de Job"). Cada uno suma tiempo.
 */
export function extractHighlights(parenthesisContent) {
  if (!parenthesisContent) return [];
  const out = [];
  for (const m of parenthesisContent.matchAll(/"([^"]+)"|“([^”]+)”|«([^»]+)»/g)) {
    const t = (m[1] || m[2] || m[3] || '').replace(/\s+/g, ' ').trim();
    if (t.length > 1) out.push(t);
  }
  return out;
}

/**
 * Textos para leer dentro del párrafo:
 *  - "(lea Salmo 62:8)", "(lee Efesios 4:25-27)", "(léanlo …)"
 *  - "… Santiago 3:14-16, donde … (léelo)": la cita va antes del paréntesis.
 */
export function extractLeaScripturesFromText(text) {
  const out = [];
  const clean = joinVerseColon(cleanHyphenatedText(text));
  const withRef = new RegExp('\\((' + READ_VERB + '\\s+(?:[^)]+\\d+:\\d+|(?:[1-3]\\s?)?[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+\\.?\\s+\\d+)[^)]*)\\)', 'gu');
  for (const m of clean.matchAll(withRef)) {
    out.push({ parenthesis_content: m[1].replace(/\s+/g, ' ').trim(), content_type: 'scripture' });
  }
  // "(léelo)" / "(léalo)" / "(léanlo)" sin cita: se toma la última cita de la misma frase
  const bare = new RegExp('\\((' + READ_VERB + ')\\)', 'gu');
  for (const m of clean.matchAll(bare)) {
    const before = clean.slice(Math.max(0, m.index - 300), m.index);
    const sentence = before.split(/[.!?](?=\s+[A-ZÁÉÍÓÚ¿¡])/u).pop();
    const refs = [...sentence.matchAll(BIBLE_REF)];
    if (refs.length) {
      out.push({ parenthesis_content: m[1].toLowerCase() + ' ' + refs[refs.length - 1][0].trim(), content_type: 'scripture' });
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Lectura del PDF con pdf.js                                          */
/* ------------------------------------------------------------------ */

// Acentos que algunos PDF dibujan como un signo aparte encima de la letra
const SPACING_TO_COMBINING = {
  '´': '́', 'ˊ': '́', '`': '̀', 'ˋ': '̀', '¨': '̈',
  '˜': '̃', 'ˆ': '̂', '¸': '̧', '˚': '̊', 'ˇ': '̌',
};
const BASE_FIX = { 'ı': 'i', 'ȷ': 'j' };

function composeAccent(accent, base) {
  const comb = SPACING_TO_COMBINING[accent];
  if (!comb || !base) return null;
  const b = BASE_FIX[base] || base;
  const composed = (b + comb).normalize('NFC');
  return composed.length === 1 ? composed : null;
}

const applyMatrix = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

const isBoldFontName = (name) => /bold|demi|black|heavy|semibold/i.test(name || '');

/**
 * Devuelve los "tramos" de texto de cada página, como los spans de PyMuPDF:
 * texto continuo en una misma línea, con la misma fuente y el mismo tamaño.
 * Cada tramo: { page, text, size, top, bold }
 */
export async function extractSpans(doc, OPS) {
  const pages = [];
  for (let pn = 1; pn <= doc.numPages; pn++) {
    const page = await doc.getPage(pn);
    const vp = page.getViewport({ scale: 1 });
    // La lista de operaciones carga las fuentes (nombres reales) y trae las líneas dibujadas
    const opList = await page.getOperatorList();
    const tc = await page.getTextContent();

    const fontInfo = (fontName) => {
      try {
        if (page.commonObjs.has(fontName)) {
          const f = page.commonObjs.get(fontName);
          return { name: f?.name || '', ascent: f?.ascent };
        }
      } catch (e) { /* fuente no disponible */ }
      return { name: '', ascent: undefined };
    };

    // 1) Glifos con posición en coordenadas de página (origen arriba-izquierda)
    const items = [];
    for (const it of tc.items) {
      if (typeof it.str !== 'string') continue;
      const [x, y] = applyMatrix(vp.transform, it.transform[4], it.transform[5]);
      const size = Math.hypot(it.transform[2], it.transform[3]);
      items.push({ str: it.str, x, y, size, width: it.width || 0, fontName: it.fontName, eol: !!it.hasEOL });
    }

    // 2) Recomponer acentos dibujados aparte ("´" + "ı" -> "í").
    //    pdf.js suele intercalar un espacio falso porque la tilde retrocede sobre la letra;
    //    se elimina si la letra base empieza justo donde acabó la anterior.
    const isBlank = (it) => it && it.str.trim() === '';
    const charWidth = (it) => (it.str.length ? it.width / it.str.length : it.size * 0.5);
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.str.length !== 1 || !SPACING_TO_COMBINING[it.str]) continue;

      // Letra base: el siguiente glifo no vacío cuya primera letra queda bajo la tilde
      let j = i + 1;
      while (j < items.length && isBlank(items[j])) j++;
      const next = items[j];
      let done = false;
      if (next && next.str && it.x >= next.x - it.size * 0.35 && it.x <= next.x + charWidth(next) + it.size * 0.15) {
        const c = composeAccent(it.str, next.str[0]);
        if (c) { next.str = c + next.str.slice(1); it.str = ''; done = true; }
      }
      if (!done) {
        // Tilde dibujada después de su letra
        let k = i - 1;
        while (k >= 0 && isBlank(items[k])) k--;
        const prev = items[k];
        if (prev && prev.str) {
          const lastCharX = prev.x + prev.width - charWidth(prev);
          if (it.x >= lastCharX - it.size * 0.35 && it.x <= prev.x + prev.width + it.size * 0.15) {
            const c = composeAccent(it.str, prev.str[prev.str.length - 1]);
            if (c) { prev.str = prev.str.slice(0, -1) + c; it.str = ''; done = true; }
          }
        }
      }
      if (done) {
        // Quitar espacios falsos alrededor de la tilde (letras pegadas entre sí)
        let a = i - 1;
        while (a >= 0 && isBlank(items[a])) a--;
        let b = i + 1;
        while (b < items.length && isBlank(items[b])) b++;
        const before = items[a], after = items[b];
        if (before && after && before.str && after.str) {
          const gap = after.x - (before.x + before.width);
          if (gap < it.size * 0.12) {
            for (let z = a + 1; z < b; z++) if (isBlank(items[z])) items[z].str = '';
          }
        }
      }
    }
    for (const it of items) if (it.str.includes('ı')) it.str = it.str.replace(/ı/g, 'i');

    // 3) Unir glifos en tramos (misma línea, misma fuente, mismo tamaño)
    const spans = [];
    let cur = null;
    const flush = () => {
      if (cur) {
        const text = cur.text.trim();
        if (text) spans.push({ page: pn - 1, text, size: Math.round(cur.size * 10) / 10, top: cur.top, bold: cur.bold });
      }
      cur = null;
    };
    for (const it of items) {
      if (!it.str) continue;
      const sizeR = Math.round(it.size * 10) / 10;
      // Salto de línea solo por posición: pdf.js marca falsos fines de línea en las tildes
      const newLine = !cur
        || Math.abs(it.y - cur.y) > Math.max(1.5, it.size * 0.45)
        || it.x < cur.x1 - Math.max(3, it.size * 1.5);
      const newFont = cur && (cur.fontName !== it.fontName || Math.round(cur.size * 10) / 10 !== sizeR);
      if (newLine || newFont) {
        flush();
        const fi = fontInfo(it.fontName);
        const ascent = typeof fi.ascent === 'number' && fi.ascent > 0 && fi.ascent < 1.5 ? fi.ascent : 0.8;
        cur = { text: '', size: it.size, fontName: it.fontName, y: it.y, x1: it.x, top: it.y - ascent * it.size, bold: isBoldFontName(fi.name) };
      }
      cur.text += it.str;
      cur.x1 = Math.max(cur.x1, it.x + it.width);
    }
    flush();

    pages.push({ spans, height: vp.height, viewport: vp, opList });
  }
  return pages;
}

/** Busca la última línea horizontal larga (separa las preguntas de repaso). */
export function detectHorizontalLine(pages, OPS) {
  let lastPage = -1;
  let lastY = -1;
  pages.forEach((pg, pageIndex) => {
    const { opList, viewport, height } = pg;
    const ctmStack = [];
    let ctm = viewport.transform.slice();
    const mul = (m, n) => [
      m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
      m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
      m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
    ];
    for (let i = 0; i < opList.fnArray.length; i++) {
      const fn = opList.fnArray[i];
      const args = opList.argsArray[i];
      if (fn === OPS.save) ctmStack.push(ctm.slice());
      else if (fn === OPS.restore) ctm = ctmStack.pop() || ctm;
      else if (fn === OPS.transform) ctm = mul(ctm, args);
      else if (fn === OPS.constructPath) {
        const [ops, coords] = args;
        let k = 0;
        let cx = 0, cy = 0;
        const pts = [];
        for (const op of ops) {
          if (op === OPS.moveTo) { cx = coords[k++]; cy = coords[k++]; pts.push(applyMatrix(ctm, cx, cy)); }
          else if (op === OPS.lineTo) {
            const [x0, y0] = applyMatrix(ctm, cx, cy);
            cx = coords[k++]; cy = coords[k++];
            const [x1, y1] = applyMatrix(ctm, cx, cy);
            pts.push([x1, y1]);
            if (Math.abs(y0 - y1) < 2 && Math.abs(x1 - x0) > 200 && y0 > height * 0.3) {
              lastPage = pageIndex; lastY = y0;
            }
          } else if (op === OPS.curveTo) { k += 6; cx = coords[k - 2]; cy = coords[k - 1]; pts.push(applyMatrix(ctm, cx, cy)); }
          else if (op === OPS.curveTo2 || op === OPS.curveTo3) { k += 4; cx = coords[k - 2]; cy = coords[k - 1]; pts.push(applyMatrix(ctm, cx, cy)); }
          else if (op === OPS.rectangle) {
            const x = coords[k++], y = coords[k++], w = coords[k++], h = coords[k++];
            const c = [applyMatrix(ctm, x, y), applyMatrix(ctm, x + w, y), applyMatrix(ctm, x, y + h), applyMatrix(ctm, x + w, y + h)];
            const xs = c.map(p => p[0]), ys = c.map(p => p[1]);
            const rw = Math.max(...xs) - Math.min(...xs), rh = Math.max(...ys) - Math.min(...ys);
            if (rw > 200 && rh < 5 && Math.min(...ys) > height * 0.3) { lastPage = pageIndex; lastY = Math.min(...ys); }
          } else if (op === OPS.closePath) { /* nada */ }
        }
      }
    }
  });
  if (lastPage < 0) {
    // Algunos PDF dibujan la línea con caracteres repetidos ("____" o glifos sin texto)
    pages.forEach((pg, pageIndex) => {
      for (const sp of pg.spans || []) {
        if (/^[\u0001-\u0008_\u2014\u2015\u2500-]{20,}$/u.test(sp.text) && sp.top > (pg.height || 0) * 0.3) {
          if (pageIndex > lastPage || (pageIndex === lastPage && sp.top > lastY)) { lastPage = pageIndex; lastY = sp.top; }
        }
      }
    });
  }
  return { found: lastPage >= 0, page: lastPage, y: lastY };
}

/**
 * Preguntas de repaso por su forma en la página, sin depender de que sean preguntas:
 * cada punto del recuadro final empieza con una casilla ("˛", "•", "■"…), va en la
 * misma letra que la casilla y termina en la siguiente casilla o en "CANCIÓN N".
 * El título es el texto en negrita justo encima de la primera casilla
 * ("¿QUÉ RESPONDERÍAS?", "¿CÓMO NOS PUEDE AYUDAR…?", "REPASO", …).
 * Sirve tanto si los puntos son preguntas como si son frases ("Ser más accesibles.").
 */
const BULLET_CHARS = '˛•·■□▪▫❑☐◻◼●○✓✔➢►';
const REVIEW_BULLET = new RegExp('^[' + BULLET_CHARS + ']$', 'u');
// Casilla pegada al texto: "• Explica por qué…"
const INLINE_BULLET = new RegExp('^[' + BULLET_CHARS + ']\\s+(\\S.*)$', 'u');
export function extractReviewByBullets(pages) {
  const isBullet = (sp) => REVIEW_BULLET.test(sp.text.trim()) || INLINE_BULLET.test(sp.text.trim());
  // Última página que tiene casillas
  let pageIndex = -1;
  pages.forEach((pg, i) => { if (pg.spans.some(isBullet)) pageIndex = i; });
  if (pageIndex < 0) return [[], ''];
  const spans = pages[pageIndex].spans;
  const bullets = spans.filter(isBullet).sort((a, b) => a.top - b.top);
  const size = bullets[0].size;
  const firstTop = bullets[0].top;
  const song = spans
    .filter((sp) => /^CANCI[OÓ]N\s+\d+/u.test(sp.text.toUpperCase()) && sp.top > firstTop)
    .sort((a, b) => a.top - b.top)[0];
  const endTop = song ? song.top - 2 : Infinity;

  const items = [];
  bullets.forEach((b, i) => {
    const from = b.top - 3;
    const to = Math.min(i + 1 < bullets.length ? bullets[i + 1].top - 3 : Infinity, endTop);
    const inline = INLINE_BULLET.exec(b.text.trim());
    const parts = spans
      .filter((sp) => sp !== b && !isBullet(sp) && !sp.bold
        && Math.abs(sp.size - size) <= 0.3 && sp.top >= from && sp.top < to)
      .sort((a, c) => a.top - c.top)
      .map((sp) => sp.text);
    if (inline) parts.unshift(inline[1]);
    const text = joinHyphenatedLines(parts).replace(/\s+/g, ' ').trim();
    if (text.length > 2) items.push(text);
  });

  // Título: texto en negrita más cercano por encima de la primera casilla
  const title = spans
    .filter((sp) => sp.bold && sp.top < firstTop && firstTop - sp.top < 60 && !/^CANCI[OÓ]N/u.test(sp.text.toUpperCase()))
    .sort((a, b) => b.top - a.top)[0];
  return [items.map((q) => createQuestionInfo(q, QUESTION_ANSWER_TIME, true)), title ? title.text.trim() : ''];
}

/** Preguntas de repaso debajo de la línea horizontal. Devuelve [preguntas, título]. */
function extractQuestionsAfterLine(pages, line) {
  const finalQuestions = [];
  let boldTitle = '';
  if (!line.found) return [finalQuestions, boldTitle];

  const items = [];
  pages.forEach((pg, pageIndex) => {
    if (pageIndex < line.page) return;
    for (const s of pg.spans) {
      if (pageIndex === line.page) {
        if (s.top > line.y + 5) items.push({ y: s.top, size: s.size, text: s.text, bold: s.bold });
      } else {
        items.push({ y: s.top + (pageIndex - line.page) * 1000, size: s.size, text: s.text, bold: s.bold });
      }
    }
  });
  items.sort((a, b) => a.y - b.y);

  const bullets = [];
  const numbered = [];
  // Sin casillas: cada punto empieza tras un hueco vertical mayor que el interlineado,
  // así un punto de dos líneas se une y las frases que no son preguntas también cuentan.
  let lastY = null;
  let gapLimit = null;
  let reviewSize = null;
  for (const { y, size, text, bold } of items) {
    if (/^CANCI[OÓ]N\s+\d+/u.test(text.toUpperCase())) break;
    if (text === '˛') continue;
    if (/^[\u0001-\u0008_\u2014\u2015\u2500-]{5,}$/u.test(text)) continue;
    // Título: primera línea en negrita o en mayúsculas ("¿QUÉ RESPONDERÍAS?", "REPASO"…)
    if (!boldTitle && !bullets.length && !numbered.length && (bold || isUpperText(text))) { boldTitle = text; continue; }
    if (isUpperText(text) && text.includes('?')) continue;
    const m = /^(\d{1,2})\.\s*(.+\?)$/u.exec(text);
    if (m) {
      const q = m[2].trim();
      if (q.length > 3) numbered.push(q);
    } else if (text.length > 2 && text.length < 200 && !/^\d/.test(text)) {
      // Solo la letra del recuadro de repaso (evita pies de imagen u otros textos)
      if (reviewSize !== null && Math.abs(size - reviewSize) > 0.3) continue;
      gapLimit = gapLimit || size * 1.6;
      const continues = bullets.length && lastY !== null && (y - lastY) <= gapLimit
        && !/[.?!]$/.test(bullets[bullets.length - 1]);
      if (continues) bullets[bullets.length - 1] = joinHyphenatedLines([bullets[bullets.length - 1], text]);
      else if (text.includes('?') || isUpperChar(text[0])) { bullets.push(text); if (reviewSize === null) reviewSize = size; }
      else continue;
      lastY = y;
    }
  }
  const list = numbered.length ? numbered : bullets;
  for (const q of list) finalQuestions.push(createQuestionInfo(q, QUESTION_ANSWER_TIME, true));
  return [finalQuestions, boldTitle];
}

/* ------------------------------------------------------------------ */
/* Análisis principal                                                  */
/* ------------------------------------------------------------------ */

/**
 * Analiza el PDF y devuelve el mismo objeto que devolvía /api/analyze-pdf.
 * @param pdfjsLib  módulo de pdf.js (para OPS y getDocument)
 * @param data      Uint8Array con el PDF
 */
export async function analyzePdf(pdfjsLib, data, filename, wpm = WORDS_PER_MINUTE, answerTime = QUESTION_ANSWER_TIME) {
  const OPS = pdfjsLib.OPS;
  const doc = await pdfjsLib.getDocument({ data, isEvalSupported: false, disableFontFace: true }).promise;
  try {
    const pages = await extractSpans(doc, OPS);
    const line = detectHorizontalLine(pages, OPS);
    return analyzeSpans(pages, line, filename, wpm, answerTime);
  } finally {
    doc.destroy();
  }
}

/**
 * Título del artículo tal como está impreso: la letra más grande de la primera página
 * (puede ocupar varias líneas: "Imitemos la humildad" + "de Jehová").
 * Si viniera todo en mayúsculas, se deja con mayúscula solo al principio.
 */
export function extractArticleTitle(pages) {
  const spans = (pages[0]?.spans || []).filter(sp => sp.text.trim());
  if (!spans.length) return '';
  const maxSize = Math.max(...spans.map(sp => sp.size));
  if (maxSize < 14) return '';
  const title = spans
    .filter(sp => sp.size >= maxSize - 0.5)
    .sort((a, b) => a.top - b.top)
    .map(sp => sp.text.trim());
  let t = joinParagraphLines(title).replace(/\s+/g, ' ').trim();
  if (t && t === t.toUpperCase()) t = t.charAt(0) + t.slice(1).toLowerCase();
  return t;
}

export function analyzeSpans(pages, line, filename, wpm, answerTime) {
  // El texto temático de la portada ("No tenemos una lucha…") va en la misma letra que
  // los párrafos pero ENCIMA del primer párrafo; el PDF lo trae después en el flujo y se
  // colaba en mitad de un párrafo. Se descartan las líneas de párrafo de la primera
  // página situadas por encima de la primera línea del texto.
  const isBodySize = (sz) => sz >= 10.5 && sz <= 11.5;
  const firstBody = pages[0]?.spans.find(sp => isBodySize(sp.size) && sp.text.trim().length > 20);
  const lines = pages.flatMap((p, i) => (i === 0 && firstBody)
    ? p.spans.filter(sp => !(isBodySize(sp.size) && sp.top < firstBody.top - 3))
    : p.spans);
  if (!lines.length) {
    throw new Error('No se pudo extraer texto del PDF. ¿Es un PDF escaneado (imagen)?');
  }

  // Tamaño de letra de las preguntas: el de los números "N." (normalmente 9).
  // Así los pies de imagen (8,5) no se confunden con preguntas.
  const qSizeCounts = {};
  for (const ln of lines) {
    const sz = Math.round(ln.size * 10) / 10;
    if (sz >= 8 && sz <= 10 && /^[\d,\s]+\.$/.test(ln.text.trim())) qSizeCounts[sz] = (qSizeCounts[sz] || 0) + 1;
  }
  const qSizes = Object.keys(qSizeCounts).map(Number);
  const questionSize = qSizes.length ? qSizes.sort((a, b) => qSizeCounts[b] - qSizeCounts[a])[0] : 9.0;

  // Primera pasada: agrupar líneas de pregunta
  const grouped = [];
  let qParts = [];
  let qNums = null;
  for (const ln of lines) {
    const text = ln.text.trim();
    const size = Math.round(ln.size * 10) / 10;
    if (!text) continue;
    const isQuestionSize = Math.abs(size - questionSize) <= 0.25;
    if (isQuestionSize) {
      const numMatch = /^([\d,\s]+)\.\s*$/.exec(text);
      if (numMatch) {
        if (qParts.length && qNums) grouped.push(['question', qNums, joinHyphenatedLines(qParts)]);
        qNums = numMatch[1].split(',').map(n => n.trim()).filter(n => isDigits(n)).map(Number);
        qParts = [];
      } else if (qNums !== null) {
        qParts.push(text);
      } else if (text.includes('?')) {
        grouped.push(['question_text', null, text]);
      } else {
        grouped.push(['other', size, text]);
      }
    } else {
      if (qParts.length && qNums) {
        grouped.push(['question', qNums, qParts.join(' ')]);
        qParts = [];
        qNums = null;
      }
      grouped.push(['text', size, text]);
    }
  }
  if (qParts.length && qNums) grouped.push(['question', qNums, qParts.join(' ')]);

  // Segunda pasada: párrafos y preguntas
  const paragraphs = new Map();
  const ensure = (n, grouped_with = []) => {
    if (!paragraphs.has(n)) paragraphs.set(n, { text_lines: [], questions: [], grouped_with });
    return paragraphs.get(n);
  };
  let currentNum = null;
  let currentLines = [];
  let initialLines = [];
  let foundFirstNumber = false;
  let finalQuestions = [];
  let finalTitle = '';
  let foundFinalSection = false;
  let skipFinalDetection = false;

  const [byBullets, bulletTitle] = extractReviewByBullets(pages);
  if (byBullets.length) {
    finalTitle = bulletTitle;
    finalQuestions = byBullets.map(q => ({ ...q, answer_time: answerTime, is_final_question: true }));
    skipFinalDetection = true;
  } else if (line.found) {
    const [raw, title] = extractQuestionsAfterLine(pages, line);
    finalTitle = title;
    finalQuestions = raw.map(q => ({ ...q, answer_time: answerTime, is_final_question: true }));
    skipFinalDetection = finalQuestions.length > 0;
  }

  for (const item of grouped) {
    const type = item[0];
    if (type === 'question') {
      const [, nums, qText] = item;
      if (foundFinalSection && !skipFinalDetection) {
        for (const q of extractMultipleQuestions(qText)) finalQuestions.push(createQuestionInfo(q, answerTime, true));
      } else if (nums && nums.length) {
        let target;
        if (nums.length > 1) {
          for (const pn of nums) {
            if (!paragraphs.has(pn)) paragraphs.set(pn, { text_lines: [], questions: [], grouped_with: nums.slice() });
            else paragraphs.get(pn).grouped_with = nums.slice();
          }
          target = nums[nums.length - 1];
        } else {
          target = nums[0];
        }
        for (const q of extractMultipleQuestions(qText)) ensure(target).questions.push(createQuestionInfo(q, answerTime, false));
      }
    } else if (type === 'question_text') {
      const qText = item[2];
      if (foundFinalSection && !skipFinalDetection && qText.includes('?')) {
        for (const q of extractMultipleQuestions(qText)) finalQuestions.push(createQuestionInfo(q, answerTime, true));
      }
    } else if (type === 'text') {
      const [, size, text] = item;
      if (text === '˛') continue;
      const upper = text.toUpperCase();
      if (!skipFinalDetection && (upper.includes('QUÉ RESPONDERÍA') || upper.includes('QUE RESPONDERIA'))) {
        foundFinalSection = true;
        if (currentNum && currentLines.length) {
          ensure(currentNum).text_lines.push(...currentLines);
          currentLines = [];
        }
        continue;
      }
      if (foundFinalSection && !skipFinalDetection) {
        if (upper.startsWith('CANCIÓN') || upper.startsWith('CANCION')) continue;
        if (text.includes('?')) {
          for (const q of extractMultipleQuestions(text)) finalQuestions.push(createQuestionInfo(q, answerTime, true));
        }
        continue;
      }
      const isParaNumber = size >= 6.0 && size <= 7.5 && isDigits(text);
      const isParagraphSize = size >= 10.5 && size <= 11.5;
      if (isParaNumber) {
        if (!foundFirstNumber) {
          foundFirstNumber = true;
          if (initialLines.length) paragraphs.set(1, { text_lines: initialLines.slice(), questions: [], grouped_with: [] });
        }
        if (currentNum && currentLines.length) ensure(currentNum).text_lines.push(...currentLines);
        currentNum = parseInt(text, 10);
        currentLines = [];
      } else if (isParagraphSize) {
        if (currentNum) currentLines.push(text);
        else if (!foundFirstNumber) initialLines.push(text);
      }
    }
  }
  if (currentNum && currentLines.length) ensure(currentNum).text_lines.push(...currentLines);
  if (!foundFirstNumber && initialLines.length) paragraphs.set(1, { text_lines: initialLines, questions: [], grouped_with: [] });

  // Resultado con tiempos
  const analyzed = [];
  let totalWords = 0, realQuestions = 0, totalEntries = 0;
  let totalReading = 0, totalQuestionTime = 0, cumulative = 0;
  let totalImages = 0, totalScriptures = 0, totalNotes = 0, totalHighlights = 0;
  const leaPrefix = READ_PREFIX;

  for (const num of [...paragraphs.keys()].sort((a, b) => a - b)) {
    const pd = paragraphs.get(num);
    const text = joinParagraphLines(pd.text_lines);
    const questions = pd.questions;
    const wordCount = countWords(text);
    let reading = calculateReadingTime(wordCount, wpm);
    const questionTime = questions.length * answerTime;
    realQuestions += questions.length;

    let imgs = 0, scr = 0, notes = 0, highlights = 0;
    // Ideas importantes (textos entre comillas en el paréntesis de la pregunta)
    for (const q of questions) {
      const hs = extractHighlights(q.parenthesis_content);
      if (hs.length) { q.highlight_contents = hs; highlights += hs.length; }
    }
    for (const q of questions) {
      if (q.content_type === 'both') { imgs++; scr++; }
      else if (q.content_type === 'image') imgs++;
      else if (q.content_type === 'scripture') scr++;
      else if (q.content_type === 'note') notes++;
    }
    for (const lea of extractLeaScripturesFromText(text)) {
      const norm = (x) => joinVerseColon(x).toLowerCase().replace(leaPrefix, '').replace(/[\s.]+/g, '');
      const leaRef = norm(lea.parenthesis_content);
      let counted = false;
      for (const q of questions) {
        if (!q.parenthesis_content) continue;
        const qc = norm(q.parenthesis_content);
        if (qc && (qc.includes(leaRef) || leaRef.includes(qc))) { counted = true; break; }
      }
      for (const q of questions) {
        if (q.text && norm(q.text).includes(leaRef)) { counted = true; break; }
      }
      if (!counted) {
        scr++;
        questions.push({ text: '', answer_time: 0, is_final_question: false, parenthesis_content: lea.parenthesis_content, content_type: 'scripture' });
      }
    }
    // Citas concretas que hay que leer (para mostrarlas en la tarjeta)
    const scriptureRefs = [];
    const addRef = (r) => {
      const ref = joinVerseColon(r).replace(READ_PREFIX, '').replace(/\s+/g, ' ').trim();
      const k = ref.toLowerCase().replace(/[\s.]+/g, '');
      if (ref && !scriptureRefs.some((x) => x.toLowerCase().replace(/[\s.]+/g, '') === k)) scriptureRefs.push(ref);
    };
    for (const lea of extractLeaScripturesFromText(text)) addRef(lea.parenthesis_content);
    for (const q of questions) {
      if (q.content_type !== 'scripture' && q.content_type !== 'both') continue;
      const refs = [...joinVerseColon(cleanHyphenatedText(q.parenthesis_content || '')).matchAll(BIBLE_REF)];
      const fromText = refs.length ? [] : [...joinVerseColon(q.text || '').matchAll(BIBLE_REF)];
      for (const m of [...refs, ...fromText]) addRef(m[0]);
    }

    totalImages += imgs; totalScriptures += scr; totalNotes += notes; totalHighlights += highlights;
    reading += (imgs + scr + notes + highlights) * EXTRA_CONTENT_TIME;

    totalWords += wordCount;
    totalEntries += questions.length;
    totalReading += reading;
    totalQuestionTime += questionTime;
    cumulative += reading + questionTime;

    analyzed.push({
      number: num,
      text,
      word_count: wordCount,
      reading_time_seconds: round2(reading),
      questions,
      scripture_refs: scriptureRefs,
      total_time_seconds: round2(reading + questionTime),
      cumulative_time_seconds: round2(cumulative),
      grouped_with: pd.grouped_with || [],
    });
  }

  for (const q of finalQuestions) {
    if (q.content_type === 'both') { totalImages++; totalScriptures++; }
    else if (q.content_type === 'image') totalImages++;
    else if (q.content_type === 'scripture') totalScriptures++;
    else if (q.content_type === 'note') totalNotes++;
  }

  if (!analyzed.length) {
    throw new Error('No se reconoció el formato del artículo de estudio en este PDF.');
  }

  const finalStart = cumulative;
  totalQuestionTime += finalQuestions.length * answerTime;

  return {
    id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()),
    filename,
    total_words: totalWords,
    total_paragraphs: analyzed.length,
    total_questions: totalEntries + finalQuestions.length,
    total_reading_time_seconds: round2(totalReading),
    total_question_time_seconds: round2(totalQuestionTime),
    total_time_seconds: 3600,
    fixed_duration: true,
    final_questions_start_time: round2(finalStart),
    final_questions: finalQuestions,
    final_questions_title: finalTitle,
    article_title: extractArticleTitle(pages),
    paragraphs: analyzed,
    timestamp: new Date().toISOString(),
    total_paragraph_questions: realQuestions,
    total_review_questions: finalQuestions.length,
    total_images: totalImages,
    total_scriptures: totalScriptures,
    total_notes: totalNotes,
    total_highlights: totalHighlights,
  };
}
