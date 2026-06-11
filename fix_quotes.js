const fs = require('fs');
let content = fs.readFileSync('gen_doc.js', 'utf8');
const replacements = [
  [String.raw`点击"注册"`, '点击\u201C注册\u201D'],
  [String.raw`"同意"`, '\u201C同意\u201D'],
  [String.raw`"拒绝"`, '\u201C拒绝\u201D'],
  [String.raw`"等我确认后回复"`, '\u201C等我确认后回复\u201D'],
  [String.raw`"仅显示🚩标记"`, '\u201C仅显示🚩标记\u201D'],
  [String.raw`"红旗按钮"`, '\u201C红旗按钮\u201D'],
  [String.raw`"全部已读"`, '\u201C全部已读\u201D'],
];
for (const [from, to] of replacements) {
  content = content.split(from).join(to);
}
fs.writeFileSync('gen_doc.js', content);
console.log('Done - replaced', content.match(/\u201C/g)?.length || 0, 'smart quotes');
