/**
 * 练习 PDF 共用样式（A4 大字号，便于打印）
 * 适用于英语 / 数学练习、小测、答案、备忘
 */

export const worksheetCss = `
  @page { size: A4; margin: 16mm 18mm; }
  body {
    font-family: "Noto Sans CJK SC", "Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", sans-serif;
    font-size: 17px;
    line-height: 1.85;
    color: #000;
    margin: 0;
  }
  h1 { font-size: 24px; margin: 0 0 6px; }
  .meta { 
    font-size: 15px; 
    color: #333; 
    margin-bottom: 14px;
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }
  .meta-left { }
  .meta-right { text-align: right; }
  .meta-right u { 
    text-decoration: underline; 
    text-underline-offset: 3px;
    letter-spacing: 2px;
  }
  h2 { font-size: 18px; margin: 16px 0 10px; }
  h3 { font-size: 17px; margin: 12px 0 8px; }
  p { margin: 7px 0; }
  em { font-style: italic; color: #333; }
  strong { font-weight: 700; }
  u { text-decoration: underline; text-underline-offset: 3px; }
  .page-break { page-break-before: always; }
  .hint { margin: 6px 0 12px; color: #333; }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 10px 0 14px;
    font-size: 16px;
  }
  th, td {
    border: 1px solid #333;
    padding: 6px 8px;
    text-align: left;
    vertical-align: top;
  }
  th { background: #f0f0f0; font-weight: 700; }
`;

export const quizCss = `
  @page { size: A4; margin: 16mm 18mm; }
  body {
    font-family: "Noto Sans CJK SC", "Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", sans-serif;
    font-size: 20px;
    line-height: 2;
    color: #000;
    margin: 0;
  }
  h1 { font-size: 28px; margin: 0 0 8px; }
  .meta { 
    font-size: 16px; 
    color: #333; 
    margin-bottom: 18px;
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }
  .meta-left { }
  .meta-right { text-align: right; }
  .meta-right u { text-decoration: underline; text-underline-offset: 4px; }
  h2 { font-size: 21px; margin: 22px 0 12px; }
  h3 { font-size: 19px; margin: 14px 0 8px; }
  p { margin: 10px 0; }
  .hint { margin: 6px 0 12px; color: #333; }
  em { font-style: italic; color: #333; }
  strong { font-weight: 700; }
  u { text-decoration: underline; text-underline-offset: 4px; }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 10px 0 14px;
    font-size: 18px;
  }
  th, td {
    border: 1px solid #333;
    padding: 8px 10px;
    text-align: left;
    vertical-align: top;
  }
  th { background: #f0f0f0; font-weight: 700; }
`;

export const answersCss = `
  @page { size: A4; margin: 16mm 18mm; }
  body {
    font-family: "Noto Sans CJK SC", "Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", sans-serif;
    font-size: 17px;
    line-height: 1.85;
    color: #000;
    margin: 0;
  }
  h1 { font-size: 24px; margin: 0 0 6px; }
  .meta { font-size: 15px; color: #333; margin-bottom: 14px; }
  h2 { font-size: 18px; margin: 18px 0 10px; }
  h3 { font-size: 17px; margin: 12px 0 8px; }
  p { margin: 6px 0; }
  strong { font-weight: 700; }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 10px 0 14px;
    font-size: 16px;
  }
  th, td {
    border: 1px solid #333;
    padding: 6px 8px;
    text-align: left;
    vertical-align: top;
  }
  th { background: #f0f0f0; font-weight: 700; }
  h2, h3 { page-break-after: avoid; }
`;

export const memoCss = `
  @page { size: A4; margin: 14mm 16mm; }
  * { box-sizing: border-box; }
  body {
    font-family: "Noto Sans CJK SC", "Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", sans-serif;
    font-size: 18px;
    line-height: 1.65;
    color: #111;
    margin: 0;
  }
  h1 { font-size: 26px; margin: 0 0 4px; }
  .meta { font-size: 16px; color: #444; margin-bottom: 10px; }
  h2 { font-size: 18px; margin: 14px 0 8px; }
  h3 { font-size: 17px; margin: 10px 0 6px; }
  p { margin: 6px 0; }
  strong { font-weight: 700; }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 15px;
  }
  th, td {
    border: 1px solid #bbb;
    padding: 6px 9px;
    text-align: left;
  }
  th { background: #f5f5f5; font-weight: 600; }
`;
