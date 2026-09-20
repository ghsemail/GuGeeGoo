/** 练习 PDF 共用样式（字号偏大，便于打印） */
export const worksheetCss = `
  @page { size: A4; margin: 16mm 18mm; }
  body {
    font-family: "Noto Sans CJK SC", "Microsoft YaHei", "Segoe UI", sans-serif;
    font-size: 17px;
    line-height: 1.85;
    color: #000;
    margin: 0;
  }
  h1 { font-size: 24px; margin: 0 0 6px; }
  .meta { font-size: 15px; color: #333; margin-bottom: 14px; }
  h2 { font-size: 18px; margin: 16px 0 10px; }
  p { margin: 7px 0; }
  em { font-style: italic; color: #333; }
  u { text-decoration: underline; text-underline-offset: 3px; }
  .page-break { page-break-before: always; }
`;

/** 小测专用（字号更大、题少、单页打印） */
export const quizCss = `
  @page { size: A4; margin: 16mm 18mm; }
  body {
    font-family: "Noto Sans CJK SC", "Microsoft YaHei", "Segoe UI", sans-serif;
    font-size: 20px;
    line-height: 2;
    color: #000;
    margin: 0;
  }
  h1 { font-size: 28px; margin: 0 0 8px; }
  .meta { font-size: 16px; color: #333; margin-bottom: 18px; }
  h2 { font-size: 21px; margin: 22px 0 12px; }
  h3 { font-size: 19px; margin: 14px 0 8px; }
  p { margin: 10px 0; }
  p.hint { margin: 6px 0 12px; }
  em { font-style: italic; color: #333; }
  u { text-decoration: underline; text-underline-offset: 4px; }
  strong { font-weight: 700; }
`;

export const answersCss = `
  @page { size: A4; margin: 16mm 18mm; }
  body {
    font-family: "Noto Sans CJK SC", "Microsoft YaHei", "Segoe UI", sans-serif;
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
`;
