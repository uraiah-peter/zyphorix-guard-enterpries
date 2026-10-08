'use client';
import { cn } from '@/lib/utils';

interface CopilotMessageProps {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

// Minimal markdown renderer — handles bold, inline code, code blocks, bullets
function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const result: React.ReactNode[] = [];
  let codeBlock: string[] = [];
  let inCode = false;
  let key = 0;

  for (const line of lines) {
    if (line.startsWith('```')) {
      if (inCode) {
        result.push(
          <pre key={key++} className="my-2 p-3 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-xs font-mono overflow-x-auto text-emerald-400 whitespace-pre-wrap">
            {codeBlock.join('\n')}
          </pre>
        );
        codeBlock = []; inCode = false;
      } else { inCode = true; }
      continue;
    }
    if (inCode) { codeBlock.push(line); continue; }

    // Headings
    if (line.startsWith('### ')) { result.push(<h3 key={key++} className="text-sm font-bold text-[var(--text-primary)] mt-3 mb-1">{line.slice(4)}</h3>); continue; }
    if (line.startsWith('## ')) { result.push(<h2 key={key++} className="text-sm font-bold text-[var(--text-primary)] mt-4 mb-1">{line.slice(3)}</h2>); continue; }
    if (line.startsWith('# ')) { result.push(<h1 key={key++} className="text-base font-bold text-[var(--text-primary)] mt-4 mb-2">{line.slice(2)}</h1>); continue; }

    // Bullets
    if (line.match(/^[-*•]\s/)) {
      result.push(<li key={key++} className="ml-4 text-sm text-[var(--text-secondary)] list-disc">{renderInline(line.slice(2))}</li>);
      continue;
    }
    if (line.match(/^\d+\.\s/)) {
      result.push(<li key={key++} className="ml-4 text-sm text-[var(--text-secondary)] list-decimal">{renderInline(line.replace(/^\d+\.\s/, ''))}</li>);
      continue;
    }

    // Empty line = spacing
    if (line.trim() === '') { result.push(<div key={key++} className="h-2" />); continue; }

    // Normal paragraph
    result.push(<p key={key++} className="text-sm text-[var(--text-secondary)] leading-relaxed">{renderInline(line)}</p>);
  }

  return result;
}

function renderInline(text: string): React.ReactNode {
  // Handle **bold** and `code`
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-[var(--text-primary)]">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="px-1.5 py-0.5 rounded bg-[var(--bg3)] text-xs font-mono text-blue-400">{part.slice(1, -1)}</code>;
    }
    return part;
  });
}

export function CopilotMessage({ role, content, isStreaming }: CopilotMessageProps) {
  const isUser = role === 'user';

  return (
    <div className={cn('flex gap-3 animate-fade-in', isUser && 'justify-end')}>
      {!isUser && (
        <div className="flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0 text-xs font-black"
          style={{ background: 'linear-gradient(135deg, #1d4ed8, #7c3aed)', color: '#fff', fontFamily: 'monospace' }}>
          Z
        </div>
      )}

      <div className={cn(
        'max-w-[82%] rounded-xl px-4 py-3',
        isUser
          ? 'bg-blue-600/20 border border-blue-500/30 text-[var(--text-primary)]'
          : 'bg-[var(--card)] border border-[var(--border)]'
      )}>
        {isUser ? (
          <p className="text-sm text-[var(--text-primary)]">{content}</p>
        ) : (
          <div className="space-y-0.5">
            {renderMarkdown(content)}
            {isStreaming && (
              <span className="inline-block w-1.5 h-4 bg-blue-400 animate-pulse ml-0.5 rounded-sm" />
            )}
          </div>
        )}
      </div>

      {isUser && (
        <div className="flex items-center justify-center w-7 h-7 rounded-full flex-shrink-0 bg-gradient-to-br from-blue-600 to-indigo-600 text-white text-xs font-bold">
          U
        </div>
      )}
    </div>
  );
}
