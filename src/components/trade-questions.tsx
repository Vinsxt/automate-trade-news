"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { answerBeginnerQuestion } from "@/lib/trade/beginner-answers";

type Context = Omit<Parameters<typeof answerBeginnerQuestion>[0], "question" | "selection">;
type TextSelection = NonNullable<Parameters<typeof answerBeginnerQuestion>[0]["selection"]>;
const examples = ["How have imports changed over time?", "Who are the largest suppliers?", "Is there market potential?"];

export function TradeQuestions(context: Context) {
  const [question, setQuestion] = useState("");
  const [selected, setSelected] = useState<TextSelection | null>(null);
  const [answer, setAnswer] = useState<ReturnType<typeof answerBeginnerQuestion> | null>(null);
  const [validation, setValidation] = useState("");
  useEffect(() => {
    const captureSelection = () => {
      const selection = document.getSelection();
      if (!selection || selection.isCollapsed || !selection.rangeCount) return;
      const range = selection.getRangeAt(0);
      const evidenceBlock = (node: Node) => (node instanceof Element ? node : node.parentElement)?.closest<HTMLElement>("[data-explainable]");
      const start = evidenceBlock(range.startContainer);
      const end = evidenceBlock(range.endContainer);
      if (!start || start !== end) return;
      const text = selection.toString().trim().slice(0, 440);
      if (text) setSelected({ text, reporter: start.dataset.market ? Number(start.dataset.market) : undefined });
    };
    document.addEventListener("selectionchange", captureSelection);
    return () => document.removeEventListener("selectionchange", captureSelection);
  }, []);

  function ask(value: string, selection?: TextSelection | null) {
    setValidation("");
    setAnswer(answerBeginnerQuestion({ ...context, question: value, selection: selection ?? undefined }));
  }

  return <section id="ask" className="surface space-y-4 p-4 sm:p-5" aria-labelledby="trade-question-title">
    <div className="space-y-1">
      <h2 id="trade-question-title" className="section-title">Ask about the data</h2>
      <p id="question-help" className="text-sm text-secondary">Ask about imports, suppliers, or market share. You can also highlight a sentence on this page. Answers use saved trade data and include source links.</p>
    </div>
    {selected && <div className="space-y-2 rounded bg-intelligence-tint p-3 text-sm">
      <p className="break-words"><strong>Selected text</strong><br />{selected.text}</p>
      <div className="flex flex-wrap gap-x-4">
        <button type="button" className="min-h-11 font-semibold text-brand-strong underline" onClick={() => ask("", selected)}>Explain selected text</button>
        <button type="button" className="min-h-11 underline" onClick={() => setSelected(null)}>Clear selection</button>
      </div>
    </div>}
    <form className="space-y-2" onSubmit={event => {
      event.preventDefault();
      if (!question.trim()) {
        setValidation("Enter a question to continue.");
        event.currentTarget.querySelector("textarea")?.focus();
        return;
      }
      ask(question.trim(), selected);
    }}>
      <label htmlFor="trade-question" className="block text-sm font-medium">Your question</label>
      <textarea id="trade-question" value={question} onChange={event => {
        setQuestion(event.target.value);
        setValidation("");
      }} rows={2} maxLength={360} required aria-describedby={validation ? "question-help question-error" : "question-help"}
        aria-invalid={validation ? true : undefined} className="field-control block w-full" />
      {validation && <p id="question-error" className="text-sm text-destructive" role="alert">{validation}</p>}
      <button type="submit" className="action-primary">Get answer</button>
    </form>
    <div className="flex flex-wrap gap-2">{examples.map(example => <button key={example} type="button"
      className="min-h-11 rounded border border-line px-3 py-2 text-left text-sm hover:bg-surface-subtle"
      onClick={() => { setQuestion(example); setSelected(null); ask(example); }}>{example}</button>)}</div>
    <div aria-live="polite" aria-atomic="true">
      {answer && <div className="space-y-2 rounded bg-intelligence-tint p-3 text-sm">
        <h3 className="font-semibold">Answer from published data</h3>
        {answer.lines.map((line, index) => <p key={index}>{line}</p>)}
        {answer.links.length > 0 && <ul className="flex flex-wrap gap-x-4">{answer.links.map(link => <li key={link.href}>
          <Link className="inline-flex min-h-11 items-center font-medium text-brand-strong underline" href={link.href}>{link.label}</Link>
        </li>)}</ul>}
      </div>}
    </div>
  </section>;
}
