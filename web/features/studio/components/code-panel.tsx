'use client';

import type { MutableRefObject } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  ChevronsUpDown,
  MoreVertical,
  RotateCcw,
  Save,
  SquareMenu,
} from 'lucide-react';

import type { CodeLine } from '@/mock/studio';
import { Button } from '@shared/components/ui/button';
import { cn } from '@shared/lib/utils';

type ErrorSummary = { line: number; title: string; detail: string };

type CodePanelProps = {
  codeLines: Array<CodeLine>;
  highlightedLine: number | null;
  lineRefs: MutableRefObject<Record<number, HTMLDivElement | null>>;
  errorConsoleOpen: boolean;
  errorSummary: ErrorSummary;
  fileName?: string;
  onSave?: () => void;
  onSelectLine: (line: number) => void;
  onClearHighlight: () => void;
  onErrorConsoleChange: (open: boolean) => void;
  onRun: () => void;
};

export function CodePanel({
  codeLines,
  highlightedLine,
  lineRefs,
  errorConsoleOpen,
  errorSummary,
  fileName,
  onSave,
  onSelectLine,
  onClearHighlight,
  onErrorConsoleChange,
  onRun,
}: CodePanelProps) {
  const hasFile = Boolean(fileName);
  const displayLines = hasFile ? codeLines : [];

  return (
    <div className="flex w-1/2 min-h-0 min-w-[420px] flex-col bg-card/80 text-foreground">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
        <div className="flex items-center gap-2">
          <SquareMenu className="size-4 text-[color:var(--accent-emphasis)]" />
          <span className="text-sm font-medium text-foreground">
            {fileName ?? 'No pack selected'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {onSave && hasFile && (
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground"
              onClick={onSave}
              disabled={!hasFile}
            >
              <Save className="size-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="text-muted-foreground">
            <MoreVertical className="size-4" />
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="min-h-0 flex-1 overflow-auto p-4">
          {hasFile ? (
            <pre className="space-y-1.5 font-mono text-sm text-muted-foreground">
              {displayLines.map((line) => (
                <div
                  key={line.number}
                  ref={(node) => {
                    lineRefs.current[line.number] = node;
                  }}
                  role="button"
                  tabIndex={0}
                  className={cn(
                    'grid grid-cols-[40px_1fr] items-start gap-3 rounded-md px-2 py-1 transition-colors',
                    highlightedLine === line.number
                      ? 'bg-destructive/15'
                      : 'hover:bg-muted/50',
                  )}
                  onClick={() => onSelectLine(line.number)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onSelectLine(line.number);
                    }
                  }}
                >
                  <span
                    className={cn(
                      'text-right text-xs text-muted-foreground',
                      highlightedLine === line.number && 'text-primary font-semibold',
                    )}
                  >
                    {line.number}
                  </span>
                  <code
                    className={cn(
                      'block whitespace-pre text-left',
                      line.isError && 'text-foreground',
                    )}
                    style={line.indent ? { paddingLeft: `${line.indent * 1.25}rem` } : undefined}
                  >
                    {line.content}
                  </code>
                </div>
              ))}
            </pre>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Select a pack to view.
            </div>
          )}
        </div>
      </div>

      {errorConsoleOpen ? (
        <div className="border-t border-white/10 bg-destructive/15">
          <div className="flex items-center justify-between px-3 py-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-destructive" />
              <span className="text-sm font-medium text-foreground">
                Error Console
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs text-muted-foreground"
                onClick={onClearHighlight}
              >
                Clear
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground"
                onClick={() => onErrorConsoleChange(false)}
              >
                <ChevronDown className="size-4" />
              </Button>
            </div>
          </div>
          <div className="max-h-40 overflow-auto px-4 pb-3">
            <div
              role="button"
              tabIndex={0}
              className="cursor-pointer rounded-lg bg-destructive/15 px-3 py-2 font-mono text-xs text-destructive hover:bg-destructive/20"
              onClick={() => onSelectLine(errorSummary.line)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelectLine(errorSummary.line);
                }
              }}
            >
              File "Mechanical Arm Base.js", line {errorSummary.line}
              <br />
              ).hole(hole_diameter)a
              <br />
              {' '.repeat(26)}^
              <br />
              {errorSummary.title}
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="flex items-center justify-between border-t border-white/10 px-3 py-2 text-left text-sm text-muted-foreground hover:bg-white/5"
          onClick={() => onErrorConsoleChange(true)}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-destructive" />
            <span>Error Console</span>
          </div>
          <ChevronsUpDown className="size-4 text-muted-foreground" />
        </button>
      )}

      <div className="flex items-center justify-end gap-2 border-t border-white/10 px-3 py-3">
        <Button variant="ghost" className="gap-2 text-muted-foreground">
          <Save className="size-4" /> Save
        </Button>
        <Button className="gap-2" onClick={onRun}>
          <RotateCcw className="size-4" /> Run
        </Button>
      </div>
    </div>
  );
}
