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
export const cleanHyphenatedText = (text) => text.replace(/(\p{L})-\s+(\p{Ll})/gu, '$1$2');

/** Verbo de lectura al inicio: "lea", "léalo", "lee", "léelo", "lean", "léanlo" (forma de usted y de tú). */
// Otros idiomas: read (EN), lies/lest (DE), leggi/leggete (IT), lis/lisez/lire (FR), leia/leiam/lê/ler (PT)
const ci = (w) => [...w].map((c) => (c.toLowerCase() !== c.toUpperCase() ? `[${c.toLowerCase()}${c.toUpperCase()}]` : c)).join('');
export const READ_VERB = '(?:' + [
  '[Ll][EeÉé](?:[Aa]|[Ee])[Nn]?(?:[Ll][Oo][Ss]?)?',
  ...['read', 'lies', 'lest', 'lesen', 'leggi', 'leggete', 'leggiamo', 'leggetelo', 'leggilo', 'lisez', 'lis', 'lire', 'lisons', 'leia', 'leiam', 'lê', 'ler', 'leiamos'].map(ci),
].join('|') + ')(?![\\p{L}])';
const READ_PREFIX = new RegExp('^' + READ_VERB + '\\s+', 'u');
/** "Efesios 6: 11, 12" (cita partida entre dos líneas) -> "Efesios 6:11, 12" */
export const joinVerseColon = (text) => text.replace(/(\d+):\s+(\d+)/g, '$1:$2');
// Cita bíblica: "Santiago 3:14-16", "1 Sam. 18:9-11", "Mat. 5:43, 44"
// Libros de un solo capítulo: sus citas no llevan "capítulo:" ("Filemón 8, 9, 17", "Judas 3")
const SINGLE_CHAPTER = '(?:Abd[ií]as|Abd\\.|Filem[oó]n|Filem\\.|Flm\\.|[23]\\s?Juan|[23]\\s?Jn\\.|Judas|Jud\\.)';
const SINGLE_CHAPTER_REF = new RegExp(SINGLE_CHAPTER + '\\s+\\d+(?:\\s?[-–,]\\s?\\d+)*', 'u');
const BIBLE_REF = new RegExp(
  '(?:[1-3]\\.?\\s?)?\\p{Lu}\\p{Ll}+\\.?\\s+\\d+:\\d+(?:\\s?[-–,]\\s?\\d+(?::\\d+)?)*'
  + '|' + SINGLE_CHAPTER + '\\s+\\d+(?:\\s?[-–,]\\s?\\d+)*(?![\\d:])',
  'gu');
/** "Lucas 1:67-73" y "Luc. 1:69" -> "luc1" (libro abreviado + capítulo) */
export function chapterKey(ref) {
  const m = /^((?:[1-3]\.?\s?)?\p{L}+)\.?\s+(\d+)(?=:)/u.exec((ref || '').trim());
  if (!m) return null;
  const book = m[1].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f\s]/g, '').slice(0, 4);
  return book + m[2];
}
// Tras "lee/lea": nombre de libro + número basta ("lee Filemón 10-12", "lea Judas 3")
const READ_BOOK_REF = /^(?:[1-3]\.?\s?)?\p{Lu}\p{Ll}+\.?\s+\d+/u;

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
    if (/\p{L}-$/u.test(out) && /^\p{Ll}/u.test(line)) out = out.slice(0, -1) + line;
    else if (/[-:]$/.test(out) && /^\d/.test(line)) out += line;
    else out += ' ' + line;
  }
  return out;
}

/** Clasifica el contenido entre paréntesis: image | scripture | note | both | "" */
export function classifyParenthesisContent(paren) {
  // "vea también la imagen", "See also picture", "Siehe auch Bild", "Vedi anche immagine",
  // "Voir aussi l’image", "Veja também a imagem"; nota/note/footnote/Fußnote
  const VERB = '(?:vea|mira|mire|observe|observa|see|siehe|seht|vedi|vedete|voir|vois|voyez|veja|vejam|ver|olhe)';
  const ALSO = '(?:también|also|auch|anche|aussi|também)';
  const ART = "(?:(?:la|las|the|das|die|den|le|les|l['’]|a|as|o|os|i|gli|l)\\s*)?";
  const IMAGE = '(?:im[aá]gen(?:es)?|ilustraci[oó]n(?:es)?|pictures?|illustrations?|images?|bild(?:er)?|abbildung(?:en)?|immagin[ei]|illustrazion[ei]|imagens?|imagem|ilustra[çc](?:ão|ões))';
  const NOTE = '(?:nota|note|footnote|fu[ßs]note|anmerkung)';
  const END = '(?![\\p{L}])';
  const lead = '(?<![\\p{L}])' + VERB + '\\s*(?:' + ALSO + '\\s+)?' + ART;
  const hasNote = new RegExp(lead + NOTE + END, 'iu').test(paren);
  const ADJ = '(?:(?:cover|front|portada|titelbild|copertina|couverture|capa)\\s+)?';

  let hasImage = false;
  if (!hasNote) {
    hasImage = new RegExp(lead + ADJ + IMAGE + END, 'iu').test(paren);
    if (!hasImage) hasImage = new RegExp('^' + IMAGE + '\\.?$', 'iu').test(paren.trim());
    if (!hasImage) hasImage = new RegExp('^' + VERB + '\\s+' + ALSO + '\\.?\\s*$', 'iu').test(paren.trim());
  }

  let hasScripture = false;
  paren = joinVerseColon(paren);
  if (READ_PREFIX.test(paren)) {
    const part = paren.replace(READ_PREFIX, '');
    if (/\d+:\d+/.test(part) || READ_BOOK_REF.test(part)) hasScripture = true;
  }
  if (!hasScripture) hasScripture = /\p{L}+\.?\s+\d+:\d+/u.test(paren);
  if (!hasScripture) hasScripture = /\p{L}+\d+:\d+/u.test(paren);
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

  // Uno o varios paréntesis tras la pregunta: "…? (Romans 7:22-24) (See also picture.)"
  const m = /\?\s*((?:\([^)]+\)[.;,]?\s*)+)/u.exec(questionText);
  if (m) {
    const paren = [...m[1].matchAll(/\(([^)]+)\)/gu)].map((x) => x[1].trim().replace(/\.$/, '')).join('; ');
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
const SCRIPTURE_IN_TEXT_CV = /\p{L}+\.?\s+\d+:\d+/u;
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
  const re = /[^?¿]*¿[^?]+\?(?:[.;,]?\s*\([^)]+\))*|[^?¿]+\?(?:[.;,]?\s*\([^)]+\))*/gu;
  let end = 0;
  for (const m of text.matchAll(re)) {
    const part = m[0].trim();
    if (part && part.length > 3) questions.push(part);
    end = m.index + m[0].length;
  }
  // "…do? Explain. (Hebrews 5:14–6:1)": lo que sigue a la última pregunta va con ella
  const rest = text.slice(end).trim();
  if (questions.length && rest && /\(/.test(rest)) questions[questions.length - 1] += ' ' + rest;
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
  const withRef = new RegExp('\\(\\s*(' + READ_VERB + '\\s+(?:[^)]+\\d+:\\d+|(?:[1-3]\\.?\\s?)?\\p{Lu}\\p{Ll}+\\.?\\s+\\d+)[^)]*)\\)', 'gu');
  for (const m of clean.matchAll(withRef)) {
    out.push({ parenthesis_content: m[1].replace(/\s+/g, ' ').trim(), content_type: 'scripture' });
  }
  // "(léelo)" / "(léalo)" / "(léanlo)" sin cita: se toma la última cita de la misma frase
  const bare = new RegExp('\\(\\s*(' + READ_VERB + ')\\s*\\)', 'gu');
  for (const m of clean.matchAll(bare)) {
    const before = clean.slice(Math.max(0, m.index - 300), m.index);
    const sentence = before.split(/[.!?](?=\s+[\p{Lu}¿¡])/u).pop();
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
    // Algunos PDF (p. ej. portugués) dejan la tilde al final de un tramo ("orienta ¸" + "c"):
    // se pasa al principio del tramo siguiente, donde está su letra.
    for (let i = 0; i < items.length - 1; i++) {
      const it = items[i];
      const m = /\s?([´ˊ`ˋ¨˜ˆ¸˚ˇ])$/u.exec(it.str);
      if (!m || it.str.length < 2) continue;
      let j = i + 1;
      while (j < items.length && isBlank(items[j])) j++;
      const next = items[j];
      if (!next || !next.str) continue;
      const base = next.str.replace(/^\s+/, '');
      const c = composeAccent(m[1], base[0]);
      if (!c) continue;
      it.str = it.str.slice(0, m.index);
      next.str = c + base.slice(1);
      for (let z = i + 1; z < j; z++) items[z].str = '';
    }
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
        if (c) {
          next.str = c + next.str.slice(1); it.str = ''; done = true;
          // "JEOV " + "´" + "A": el espacio del tramo anterior es falso (la tilde va pegada)
          let k = i - 1;
          while (k >= 0 && items[k] && items[k].str === '') k--;
          const prev = items[k];
          // (la letra empieza antes de que acabe el tramo anterior: ese espacio no existe)
          // Excepción: palabras de una sola letra acentuada ("como é que", "à", "às").
          const standalone = /^(?:[éÉàÀóÓ]|[àÀ]s)(?=$|[\s,.;:!?)])/u.test(next.str);
          if (prev && / $/.test(prev.str) && !standalone && next.x < prev.x + prev.width - it.size * 0.1) prev.str = prev.str.replace(/ +$/, '');
        }
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
// "CANCIÓN 12" en cada idioma (cierra el artículo)
const SONG_RE = /^(?:CANCI[OÓ]N|SONG|LIED|CANTICO|CANTIQUE|C[AÂ]NTICO)\s+\d+/u;
const SONG_WORD_RE = /^(?:CANCI[OÓ]N|SONG|LIED|CANTICO|CANTIQUE|C[AÂ]NTICO)\b/u;
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
    .filter((sp) => SONG_RE.test(sp.text.toUpperCase()) && sp.top > firstTop)
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
    .filter((sp) => sp.bold && sp.top < firstTop && firstTop - sp.top < 60 && !SONG_WORD_RE.test(sp.text.toUpperCase()))
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
    if (SONG_RE.test(text.toUpperCase())) break;
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
/* ------------------------------------------------------------------ */
/* Revista completa: varios artículos de estudio, uno por semana       */
/* ------------------------------------------------------------------ */

// Meses en los idiomas de la app (sin tildes, en mayúsculas)
const MONTH_NAMES = [
  ['ENERO', 'JANUARY', 'JANUAR', 'GENNAIO', 'JANVIER', 'JANEIRO'],
  ['FEBRERO', 'FEBRUARY', 'FEBRUAR', 'FEBBRAIO', 'FEVRIER', 'FEVEREIRO'],
  ['MARZO', 'MARCH', 'MARZ', 'MARS', 'MARCO'],
  ['ABRIL', 'APRIL', 'APRILE', 'AVRIL'],
  ['MAYO', 'MAY', 'MAI', 'MAGGIO', 'MAIO'],
  ['JUNIO', 'JUNE', 'JUNI', 'GIUGNO', 'JUIN', 'JUNHO'],
  ['JULIO', 'JULY', 'JULI', 'LUGLIO', 'JUILLET', 'JULHO'],
  ['AGOSTO', 'AUGUST', 'AOUT'],
  ['SEPTIEMBRE', 'SETIEMBRE', 'SEPTEMBER', 'SETTEMBRE', 'SEPTEMBRE', 'SETEMBRO'],
  ['OCTUBRE', 'OCTOBER', 'OKTOBER', 'OTTOBRE', 'OCTOBRE', 'OUTUBRO'],
  ['NOVIEMBRE', 'NOVEMBER', 'NOVEMBRE', 'NOVEMBRO'],
  ['DICIEMBRE', 'DECEMBER', 'DEZEMBER', 'DICEMBRE', 'DECEMBRE', 'DEZEMBRO'],
];
const MONTHS = {};
MONTH_NAMES.forEach((names, idx) => names.forEach((n) => { MONTHS[n] = idx; }));
// Palabras de unión permitidas en la cabecera ("2 A 8 DE MARÇO DE 2026", "MARCH 2-8, 2026")
const WEEK_FILLERS = new Set(['DE', 'DEL', 'A', 'AL', 'AU', 'DU', 'BIS', 'TO']);
const stripMarks = (t) => t.normalize('NFD').replace(/\p{M}/gu, '');

/**
 * Interpreta la cabecera de semana de un artículo, en cualquiera de los idiomas:
 * "12-18 DE OCTUBRE DE 2026", "MARCH 2-8, 2026", "2.-8. MÄRZ 2026", "2-8 MARZO 2026",
 * "2-8 MARS 2026", "2 A 8 DE MARÇO DE 2026", "30. MÄRZ–5. APRIL 2026",
 * "MARCH 30–APRIL 5, 2026", "28 DE DICIEMBRE DE 2026-3 DE ENERO DE 2027".
 * Devuelve {label, start, end} o null.
 */
export function parseWeekHeader(text) {
  const t = (text || '').toUpperCase().replace(/\s+/g, ' ').trim();
  if (!t || t.length > 60) return null;
  const tokens = stripMarks(t).replace(/[-–—,.]/g, ' ').split(' ').filter(Boolean);
  const days = [], months = [], years = [];
  for (const tok of tokens) {
    if (/^\d{4}$/.test(tok)) years.push(parseInt(tok, 10));
    else if (/^\d{1,2}$/.test(tok)) days.push(parseInt(tok, 10));
    else if (tok in MONTHS) months.push(MONTHS[tok]);
    else if (!WEEK_FILLERS.has(tok)) return null;
  }
  if (days.length !== 2 || months.length < 1 || months.length > 2 || years.length < 1 || years.length > 2) return null;
  const startMonth = months[0];
  const endMonth = months[months.length - 1];
  const endYear = years[years.length - 1];
  const startYear = years.length === 2 ? years[0] : (startMonth > endMonth ? endYear - 1 : endYear);
  const start = new Date(startYear, startMonth, days[0]);
  const end = new Date(endYear, endMonth, days[1]);
  if (isNaN(start) || isNaN(end) || end < start || (end - start) > 8 * 86400000) return null;
  return { label: t.replace(/\s*([-–—])\s*/, '$1'), start, end };
}

/**
 * Artículos de estudio de una revista completa: cada uno empieza en la página que
 * lleva arriba su semana ("12-18 DE OCTUBRE DE 2026") y termina en la página del
 * recuadro de repaso (o justo antes del siguiente artículo).
 */
export function findStudyArticles(pages) {
  const starts = [];
  pages.forEach((pg, i) => {
    const header = pg.spans
      .filter((sp) => sp.top < 80)
      .map((sp) => parseWeekHeader(sp.text))
      .find(Boolean);
    if (header && !starts.some((a) => a.label === header.label)) starts.push({ ...header, firstPage: i });
  });
  const hasReview = (pg) => pg.spans.some((sp) => /^[˛•■□▪❑☐]$/u.test(sp.text.trim()))
    && pg.spans.some((sp) => SONG_RE.test(sp.text.toUpperCase()));
  return starts.map((a, k) => {
    const limit = k + 1 < starts.length ? starts[k + 1].firstPage - 1 : pages.length - 1;
    let lastPage = limit;
    for (let i = a.firstPage; i <= limit; i++) { if (hasReview(pages[i])) { lastPage = i; break; } }
    return { ...a, lastPage };
  });
}

/** Lunes (00:00) de la semana de una fecha. */
export function mondayOf(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dow = (d.getDay() + 6) % 7; // lunes = 0
  d.setDate(d.getDate() - dow);
  return d;
}

/** Elige el artículo cuya semana contiene la fecha (o el más cercano). */
export function pickArticleForDate(articles, date) {
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const exact = articles.find((a) => day >= a.start && day <= a.end);
  if (exact) return { article: exact, exact: true };
  const monday = mondayOf(day);
  const sorted = [...articles].sort((a, b) => Math.abs(a.start - monday) - Math.abs(b.start - monday));
  return { article: sorted[0] || null, exact: false };
}

export async function analyzePdf(pdfjsLib, data, filename, wpm = WORDS_PER_MINUTE, answerTime = QUESTION_ANSWER_TIME, options = {}) {
  const OPS = pdfjsLib.OPS;
  const doc = await pdfjsLib.getDocument({ data, isEvalSupported: false, disableFontFace: true }).promise;
  try {
    let pages = await extractSpans(doc, OPS);
    let weekInfo = null;
    // ¿Revista completa? (más de un artículo de estudio con su semana)
    const articles = findStudyArticles(pages);
    if (articles.length >= 2) {
      const date = options.targetDate ? new Date(options.targetDate) : new Date();
      const { article, exact } = pickArticleForDate(articles, date);
      pages = pages.slice(article.firstPage, article.lastPage + 1);
      weekInfo = {
        week_label: article.label,
        week_start: article.start.toISOString(),
        week_exact: exact,
        from_issue: true,
        issue_weeks: articles.map((a) => ({ label: a.label, start: a.start.toISOString(), title: '' })),
      };
    } else if (articles.length === 1) {
      weekInfo = { week_label: articles[0].label, week_start: articles[0].start.toISOString(), week_exact: true, from_issue: false };
    }
    const line = detectHorizontalLine(pages, OPS);
    const result = analyzeSpans(pages, line, filename, wpm, answerTime);
    return weekInfo ? { ...result, ...weekInfo } : result;
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
  const isBodySize = (sz) => sz >= 10.2 && sz <= 11.6; // 10,3-10,6 en algunas ediciones (p. ej. portugués de Brasil)
  const firstBody = pages[0]?.spans.find(sp => isBodySize(sp.size) && sp.text.trim().length > 20);
  const lines = pages.flatMap((p, i) => (i === 0 && firstBody)
    ? p.spans.filter(sp => !(isBodySize(sp.size) && sp.top < firstBody.top - 3))
    : p.spans);
  if (!lines.length) {
    throw new Error('ERR_NO_TEXT');
  }

  // Tamaño de letra de las preguntas: el de los números "N." (normalmente 9).
  // Así los pies de imagen (8,5) no se confunden con preguntas.
  const qSizeCounts = {};
  for (const ln of lines) {
    const sz = Math.round(ln.size * 10) / 10;
    if (sz >= 8 && sz <= 10 && /^\d[\d,\s\-–]*\.$/.test(ln.text.trim())) qSizeCounts[sz] = (qSizeCounts[sz] || 0) + 1;
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
      // "4." · "1, 2." (español) · "1-2." / "9–10." (otros idiomas)
      const numMatch = /^(\d[\d,\s\-–]*)\.\s*$/.exec(text);
      if (numMatch) {
        if (qParts.length && qNums) grouped.push(['question', qNums, joinHyphenatedLines(qParts)]);
        qNums = numMatch[1].split(',').flatMap((part) => {
          const r = /^\s*(\d+)\s*[-–]\s*(\d+)\s*$/.exec(part);
          if (r && +r[2] > +r[1] && +r[2] - +r[1] < 10) return Array.from({ length: +r[2] - +r[1] + 1 }, (_, i) => +r[1] + i);
          const n = part.trim();
          return isDigits(n) ? [Number(n)] : [];
        });
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
        if (SONG_WORD_RE.test(upper)) continue;
        if (text.includes('?')) {
          for (const q of extractMultipleQuestions(text)) finalQuestions.push(createQuestionInfo(q, answerTime, true));
        }
        continue;
      }
      const isParaNumber = size >= 6.0 && size <= 7.5 && isDigits(text);
      const isParagraphSize = isBodySize(size);
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
    // Un mismo texto (libro + capítulo) solo se cuenta una vez por párrafo:
    // "a) Según Lucas 1:67-73…" y "b) …del que habla Lucas 1:69?" son la misma lectura.
    const seenChapters = new Set();
    const chapterKeys = (q) => {
      const src = joinVerseColon(cleanHyphenatedText(`${q.parenthesis_content || ''} ${q.text || ''}`));
      return [...src.matchAll(BIBLE_REF)].map(m => chapterKey(m[0])).filter(Boolean);
    };
    const isRepeatedScripture = (q) => {
      const keys = chapterKeys(q);
      const repeated = keys.length > 0 && keys.every(k => seenChapters.has(k));
      keys.forEach(k => seenChapters.add(k));
      return repeated;
    };
    for (const q of questions) {
      if (q.content_type === 'both') { imgs++; if (!isRepeatedScripture(q)) scr++; }
      else if (q.content_type === 'image') imgs++;
      else if (q.content_type === 'scripture') { if (!isRepeatedScripture(q)) scr++; }
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
      // Misma lectura citada por la pregunta ("Según Juan 10:29, ¿…?" y "(lee Juan 10:29; Sant. 4:7)")
      if (!counted) {
        const leaFirst = [...joinVerseColon(lea.parenthesis_content.replace(leaPrefix, '')).matchAll(BIBLE_REF)][0];
        const lk = leaFirst ? chapterKey(leaFirst[0]) : null;
        if (lk && questions.some(q => chapterKeys(q).includes(lk))) counted = true;
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
      const ck = chapterKey(ref);
      const nk = (x) => x.toLowerCase().replace(/[\s.]+/g, '');
      if (ref && !scriptureRefs.some((x) => nk(x) === k || nk(x).includes(k) || k.includes(nk(x))
        || (ck && chapterKey(x) === ck))) scriptureRefs.push(ref);
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
    throw new Error('ERR_FORMAT');
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
