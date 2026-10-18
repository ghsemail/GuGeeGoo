#!/usr/bin/env python3
"""从「新概念第一册笔记.docx」生成词汇/语法/练习 MD（可重复运行）。"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path

from docx import Document

ROOT = Path(__file__).resolve().parents[1]
DOCX = ROOT / "课程资料" / "新概念第一册笔记.docx"
VOCAB_DIR = ROOT / "词汇"
GRAMMAR_DIR = ROOT / "语法"
PRACTICE_DIR = ROOT / "练习"

LESSON_RE = re.compile(r"^Lesson\s+(\d+)\s+(.+)$", re.I)
POS_RE = re.compile(
    r"(n\.|v\.|adj\.|adv\.|prep\.|pron\.|det\.|modal verb|int\.|conj\.|art\.|"
    r"num\.|phrase|modal v\.|possessive adjective|interj\.)",
    re.I,
)
CJK_RE = re.compile(r"[\u4e00-\u9fff]")


def is_vocab_header(text: str) -> bool:
    return bool(
        re.match(r"^\[?词汇\]?(?:（\d+）)?$", text)
        or re.match(r"^\[?单词\]?(?:（\d+）)?$", text)
    )


def is_grammar_header(text: str) -> bool:
    if text in ("语法", "[语法]"):
        return True
    return bool(re.match(r"^\[语法\](?:（\d+）)?$", text))


def is_text_header(text: str) -> bool:
    return text == "课文"


def parse_vocab_line(text: str) -> tuple[str, str, str] | None:
    if "\t" not in text or text.startswith("★"):
        return None
    if is_vocab_header(text) or is_grammar_header(text):
        return None
    if re.match(r"^[A-Z][A-Z0-9\. ]+:\s", text):
        return None

    parts = [p.strip() for p in text.split("\t") if p.strip()]
    if len(parts) < 2:
        return None

    eng = parts[0].lstrip("★").strip()
    if not re.match(r"^[A-Za-z]", eng):
        return None
    if len(parts) > 2 and not POS_RE.search(parts[1]):
        return None

    rest = parts[1]
    m_cjk = CJK_RE.search(rest)
    if m_cjk:
        pos_part = rest[: m_cjk.start()].strip()
        zh = rest[m_cjk.start() :].strip()
    else:
        pos_part = ""
        zh = rest.strip()

    if pos_part:
        pos = pos_part
    else:
        pos = "—"

    if not zh:
        return None
    return eng, pos, zh


@dataclass
class Lesson:
    num: int
    title: str
    lines: list[str] = field(default_factory=list)
    words: list[tuple[str, str, str]] = field(default_factory=list)
    grammar: list[str] = field(default_factory=list)
    text: list[str] = field(default_factory=list)
    extra_before_vocab: list[str] = field(default_factory=list)


def split_sections(lesson: Lesson) -> None:
    mode = "pre"
    seen_vocab = False
    for line in lesson.lines:
        if is_vocab_header(line):
            mode = "vocab"
            seen_vocab = True
            continue
        if is_grammar_header(line):
            mode = "grammar"
            continue
        if is_text_header(line):
            mode = "text"
            continue

        if mode == "pre":
            if parse_vocab_line(line):
                mode = "vocab"
                seen_vocab = True
                w = parse_vocab_line(line)
                if w:
                    lesson.words.append(w)
            else:
                lesson.extra_before_vocab.append(line)
            continue

        if mode == "vocab":
            if is_grammar_header(line):
                mode = "grammar"
                lesson.grammar.append(line)
                continue
            w = parse_vocab_line(line)
            if w:
                lesson.words.append(w)
            continue

        if mode == "grammar":
            lesson.grammar.append(line)
            continue

        if mode == "text":
            lesson.text.append(line)
            continue

    if not seen_vocab:
        lesson.extra_before_vocab.extend(lesson.lines)


def load_lessons() -> list[Lesson]:
    doc = Document(str(DOCX))
    lessons: list[Lesson] = []
    current: Lesson | None = None

    for para in doc.paragraphs:
        text = para.text.strip()
        if not text:
            continue
        m = LESSON_RE.match(text)
        if m:
            if current:
                split_sections(current)
                lessons.append(current)
            current = Lesson(num=int(m.group(1)), title=m.group(2).strip())
            continue
        if current is not None:
            current.lines.append(text)

    if current:
        split_sections(current)
        lessons.append(current)

    return lessons


def md_escape_cell(s: str) -> str:
    return s.replace("|", "\\|").replace("\n", " ")


def write_word_table(lessons: list[Lesson]) -> None:
    lines = [
        "# 新概念英语 · 第一册 · 单词表",
        "",
        "> 顾景源 · 英语 · 词汇查阅",
        f"> **来源：** [课程资料/新概念第一册笔记.docx](../课程资料/新概念第一册笔记.docx)（脚本提取，{len(lessons)} 课次标题）",
        "> **说明：** 按课（Lesson）分组；词性/说明栏若无标注记为「—」。",
        "",
        "### 词性缩写",
        "",
        "| 缩写 | 含义 |",
        "|------|------|",
        "| n. | 名词 |",
        "| v. | 动词 |",
        "| adj. | 形容词 |",
        "| adv. | 副词 |",
        "| prep. | 介词 |",
        "| pron. | 代词 |",
        "| det. | 限定词 |",
        "| modal verb / modal v. | 情态动词 |",
        "| int. / interj. | 感叹词 |",
        "| phrase | 短语（无单独词性标注时） |",
        "",
        "---",
        "",
        "## 按课（Words and expressions）",
        "",
    ]

    for lesson in lessons:
        lines.append(f"### 第 {lesson.num} 课 · {lesson.title}")
        lines.append("")
        if lesson.words:
            lines.append("| 单词/短语 | 词性/说明 | 中文 |")
            lines.append("|-----------|-----------|------|")
            for eng, pos, zh in lesson.words:
                lines.append(
                    f"| {md_escape_cell(eng)} | {md_escape_cell(pos)} | {md_escape_cell(zh)} |"
                )
        else:
            lines.append("*（本课笔记未识别到表格化词汇行；见语法/练习文件或课程资料原文。）*")
        lines.append("")

    (VOCAB_DIR / "单词表.md").write_text("\n".join(lines), encoding="utf-8")


def write_dictation_overview(lessons: list[Lesson]) -> None:
    lines = [
        "# 新概念英语 · 第一册 · 听写总览",
        "",
        "> 顾景源 · 英语 · **全册汇总**（各课听写明细待建：`练习/第N课/第N课-听写.md`）",
        "> 词库：[单词表.md](./单词表.md)",
        "",
        "**状态：** 尚未开始听写（2026-10-18 建库）。",
        "",
        "---",
        "",
        "## 一、听写记录",
        "",
        "每次听写一行，最新的在最上面。",
        "",
        "| 日期 | 范围 | 总数 | 对 | 错 | 得分 | 错词 | 重读的词 | 明细 |",
        "|------|------|------|----|----|------|------|----------|------|",
        "| — | — | — | — | — | — | — | — | *尚无记录* |",
        "",
        "---",
        "",
        "## 二、待巩固（不熟悉 / 巩固中）",
        "",
        "| 单词/短语 | 所属课 | 错误写法 | 状态 | 连对 | 第一次错的日期 | 备注 |",
        "|-----------|--------|----------|------|------|----------------|------|",
        "| — | — | — | — | — | — | *尚无待巩固词* |",
        "",
        "---",
        "",
        "## 三、各课听写文件",
        "",
        "批改时 **同时** 更新：本节「听写记录」「待巩固」+ 对应课 `第N课-听写.md`（待建）。",
        "",
        "| 课次 | 听写文件 | 单词表范围 | 听写状态 |",
        "|------|----------|------------|----------|",
    ]
    for lesson in lessons:
        n = lesson.num
        word_note = f"{len(lesson.words)} 词" if lesson.words else "见笔记"
        lines.append(
            f"| 第 {n} 课 | [第{n}课-听写.md](../练习/第{n}课/第{n}课-听写.md)（待建） | {word_note} | 未听写 |"
        )
    lines.append("")
    (VOCAB_DIR / "听写单词本.md").write_text("\n".join(lines), encoding="utf-8")


def grammar_body(lines: list[str]) -> str:
    if not lines:
        return "*（笔记中未识别到独立的「语法」小节；可查阅课程资料 docx 或课文相关说明。）*\n"
    out = []
    for line in lines:
        if is_grammar_header(line):
            continue
        if line.startswith("★"):
            out.append(f"- **{line.lstrip('★').strip()}**")
        elif re.match(r"^\d+[、．.]", line):
            out.append(f"- {line}")
        else:
            out.append(line)
    return "\n\n".join(out) + "\n"


def write_grammar(lesson: Lesson) -> None:
    d = GRAMMAR_DIR / f"第{lesson.num}课"
    d.mkdir(parents=True, exist_ok=True)
    path = d / f"第{lesson.num}课-语法.md"
    content = [
        f"# 第 {lesson.num} 课 · {lesson.title} · 语法",
        "",
        f"> 来源：课程资料 · Lesson {lesson.num}",
        "",
        "---",
        "",
        grammar_body(lesson.grammar),
    ]
    path.write_text("\n".join(content), encoding="utf-8")


def write_practice(lesson: Lesson) -> None:
    d = PRACTICE_DIR / f"第{lesson.num}课"
    d.mkdir(parents=True, exist_ok=True)
    path = d / f"第{lesson.num}课-练习.md"
    lines = [
        f"# 第 {lesson.num} 课 · {lesson.title} · 练习",
        "",
        "> **状态：** 占位 · 本课系统练习待出",
        "",
        "| 材料 | 路径 |",
        "|------|------|",
        f"| 词汇 | [单词表.md](../../词汇/单词表.md)（第 {lesson.num} 课） |",
        f"| 语法 | [第{lesson.num}课-语法.md](../../语法/第{lesson.num}课/第{lesson.num}课-语法.md) |",
        "",
        "---",
        "",
        "## 说明",
        "",
        "本文件为练习占位。确认出题范围后，在此补充听写、选词、句型转换等练习（学生可见内容不含内部编码）。",
        "",
    ]
    if lesson.text:
        lines.extend(["## 笔记 · 课文（参考）", ""])
        lines.extend(lesson.text)
        lines.append("")
    if lesson.extra_before_vocab and not lesson.words:
        lines.extend(["## 笔记 · 课内要点（无表格词汇）", ""])
        for x in lesson.extra_before_vocab[:40]:
            lines.append(f"- {x}")
        if len(lesson.extra_before_vocab) > 40:
            lines.append(f"- …（共 {len(lesson.extra_before_vocab)} 行，见课程资料 docx）")
        lines.append("")

    path.write_text("\n".join(lines), encoding="utf-8")


def write_grammar_index(lessons: list[Lesson]) -> None:
    lines = [
        "# 新概念英语 · 第一册 · 语法索引",
        "",
        "> 各课语法要点 MD 位于 `语法/第N课/`。",
        "",
        "| 课次 | 标题 | 语法文件 |",
        "|------|------|----------|",
    ]
    for lesson in lessons:
        n = lesson.num
        has = "有" if lesson.grammar else "待补"
        lines.append(
            f"| 第 {n} 课 | {md_escape_cell(lesson.title)} | "
            f"[第{n}课-语法.md](./第{n}课/第{n}课-语法.md)（{has}） |"
        )
    lines.append("")
    (GRAMMAR_DIR / "课程索引.md").write_text("\n".join(lines), encoding="utf-8")


def write_readmes() -> None:
    (VOCAB_DIR / "README.md").write_text(
        "\n".join(
            [
                "# 新概念英语 · 第一册 · 词汇",
                "",
                "| 文件 | 说明 |",
                "|------|------|",
                "| [单词表.md](./单词表.md) | 按课整理的词汇表（来自学习笔记） |",
                "| [听写单词本.md](./听写单词本.md) | 听写总览骨架（尚未开始听写） |",
                "",
                "**同级目录：** [语法](../语法/课程索引.md) · [练习](../练习/README.md) · [课程资料](../课程资料/)",
                "",
            ]
        ),
        encoding="utf-8",
    )

    (PRACTICE_DIR / "README.md").write_text(
        "\n".join(
            [
                "# 新概念英语 · 第一册 · 练习",
                "",
                "按 **第 N 课** 分子目录；每课含占位练习 MD，确认范围后再出题并生成 PDF（流程同五年级英语练习）。",
                "",
                "| 说明 |",
                "|------|",
                "| 目录名：`第N课/`（阿拉伯数字，与 Lesson N 对应） |",
                "| 源文件：`第N课-练习.md`；听写待建 `第N课-听写.md` |",
                "",
            ]
        ),
        encoding="utf-8",
    )

    (ROOT / "README.md").write_text(
        "\n".join(
            [
                "# 新概念英语 · 第一册",
                "",
                "> 学习材料目录（与 [五年级英语](../五年级/README.md) 并列）",
                "",
                "| 目录 | 说明 |",
                "|------|------|",
                "| [课程资料/](./课程资料/) | 原始笔记（`新概念第一册笔记.docx`） |",
                "| [词汇/](./词汇/README.md) | 单词表、听写总览 |",
                "| [语法/](./语法/课程索引.md) | 按课语法要点（**语法** 目录，非「讲义」） |",
                "| [练习/](./练习/README.md) | 按课练习占位与后续 PDF |",
                "",
                "**维护：** 更新 docx 后可在 `scripts/extract-from-notes.py` 重新生成词汇表与语法/练习骨架。",
                "",
            ]
        ),
        encoding="utf-8",
    )


def main() -> None:
    lessons = load_lessons()
    VOCAB_DIR.mkdir(parents=True, exist_ok=True)
    GRAMMAR_DIR.mkdir(parents=True, exist_ok=True)
    PRACTICE_DIR.mkdir(parents=True, exist_ok=True)

    write_word_table(lessons)
    write_dictation_overview(lessons)
    write_grammar_index(lessons)
    write_readmes()

    for lesson in lessons:
        write_grammar(lesson)
        write_practice(lesson)

    total_words = sum(len(l.words) for l in lessons)
    print(f"lessons={len(lessons)} words={total_words} grammar_sections={sum(1 for l in lessons if l.grammar)}")


if __name__ == "__main__":
    main()
