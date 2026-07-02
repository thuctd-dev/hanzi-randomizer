// Quick smoke-test for the parser logic (mirrors parseVocabulary.ts in plain JS)

function isCJK(s) {
  return /^[\u4E00-\u9FFF\u3400-\u4DBF\uF900-\uFAFF]+$/.test(s);
}
function isPinyin(s) {
  if (/[\u4E00-\u9FFF]/.test(s)) return false;
  return /^[a-zA-ZāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜüÀ-žñÑ\s]+$/.test(s.trim());
}

function parseWhitespaceChunk(chunk) {
  const cells = chunk
    .split(/[ \t]{2,}|\t/)
    .map(c => c.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const items = [];
  let i = 0;
  while (i < cells.length) {
    const h = cells[i];
    const stripped = h.replace(/[^\u4E00-\u9FFF\u3400-\u4DBF]/g, '');
    if (!stripped || !isCJK(stripped)) { i++; continue; }
    const p = cells[i + 1];
    if (!p || !isPinyin(p)) { i++; continue; }
    const meaningParts = [];
    let j = i + 2;
    while (j < cells.length) {
      const next = cells[j];
      const ns = next.replace(/[^\u4E00-\u9FFF\u3400-\u4DBF]/g, '');
      if (ns && isCJK(ns) && next.length <= 6) break;
      meaningParts.push(next);
      j++;
    }
    const meaning = meaningParts.join(' ').trim();
    if (meaning) items.push({ hanzi: h.trim(), pinyin: p.trim(), meaning });
    i = j;
  }
  return items;
}

const sample = `你   nǐ   bạn, anh, chị, ông, bà (đại từ nhân xưng ngôi   thứ 2)        女   nǚ   nữ, phụ nữ, con gái       好   hǎo   tốt, khỏe, đẹp, hay       你好   nǐ hǎo   xin chào       吗   ma   ...không? (trợ từ nghi vấn đặt ở cuối câu)       我   wǒ   tôi, tớ, mình, tao (đại từ nhân xưng ngôi thứ 1)       人   rén   người       大   dà   to, lớn       天   tiān   trời, ngày       夫   fū   chồng, người đàn ông (như trong "trượng phu")       失   shī   mất, đánh mất, thất lạc (như trong "thất bại", "thất   lạc")       矢   shǐ   mũi tên (chữ tượng hình giống mũi tên)       矢口   shǐkǒu   thề thốt, khẳng định chắc chắn        口   kǒu   miệng, mồm       日   rì   mặt trời, ngày       白   bái   trắng, màu trắng       马   mǎ   con ngựa`;

const results = parseWhitespaceChunk(sample);
console.log(`Parsed: ${results.length} items`);
results.forEach((r, i) => console.log(`  ${i+1}. ${r.hanzi} | ${r.pinyin} | ${r.meaning}`));

// Also test pipe format
const pipeTest = '忙 | máng | Bận, bận rộn\n汉语 | hànyǔ | Tiếng Hán';
const pipeResults = pipeTest.split('\n').map(line => {
  const parts = line.split('|').map(p => p.trim());
  if (parts.length >= 3) return { hanzi: parts[0], pinyin: parts[1], meaning: parts[2] };
  return null;
}).filter(Boolean);
console.log(`\nPipe format: ${pipeResults.length} items`);
pipeResults.forEach(r => console.log(`  ${r.hanzi} | ${r.pinyin} | ${r.meaning}`));
