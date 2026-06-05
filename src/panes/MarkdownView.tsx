import { TextAttributes } from "@opentui/core";
import { marked, type Token, type Tokens } from "marked";

const ACCENT = "#A6E22E";
const DIM = "#9CA3AF";
const FG = "#E5E7EB";

function inlineNodes(tokens: Token[] | undefined, keyPrefix: string): React.ReactNode[] {
  if (!tokens) return [];

  return tokens.map((token, index) => {
    const key = `${keyPrefix}-${index}`;
    switch (token.type) {
      case "text":
      case "escape":
        return <span key={key}>{token.text}</span>;
      case "strong":
        return (
          <span key={key} fg={ACCENT} attributes={TextAttributes.BOLD}>
            {inlineNodes(token.tokens, key)}
          </span>
        );
      case "em":
        return (
          <span key={key} attributes={TextAttributes.ITALIC}>
            {inlineNodes(token.tokens, key)}
          </span>
        );
      case "codespan":
        return <span key={key} fg={DIM}>{token.text}</span>;
      case "link":
        return (
          <span key={key} fg={ACCENT} attributes={TextAttributes.UNDERLINE}>
            {inlineNodes(token.tokens, key)}
          </span>
        );
      case "del":
        return <span key={key}>{inlineNodes(token.tokens, key)}</span>;
      case "br":
        return <span key={key}>{"\n"}</span>;
      default:
        if ("tokens" in token && Array.isArray(token.tokens)) {
          return <span key={key}>{inlineNodes(token.tokens, key)}</span>;
        }
        if ("text" in token && typeof token.text === "string") {
          return <span key={key}>{token.text}</span>;
        }
        return <span key={key}>{token.raw}</span>;
    }
  });
}

function listItemNodes(item: Tokens.ListItem, keyPrefix: string): React.ReactNode[] {
  const inline: React.ReactNode[] = [];
  for (const token of item.tokens) {
    if ("tokens" in token && Array.isArray(token.tokens)) {
      inline.push(...inlineNodes(token.tokens, `${keyPrefix}-${inline.length}`));
    } else if ("text" in token && typeof token.text === "string") {
      inline.push(<span key={`${keyPrefix}-${inline.length}`}>{token.text}</span>);
    }
  }
  return inline;
}

function blockNode(token: Token, index: number): React.ReactNode {
  const key = `markdown-${index}`;
  switch (token.type) {
    case "space":
    case "def":
      return null;
    case "heading":
      return (
        <box key={key} marginTop={token.depth === 1 && index > 0 ? 1 : 0}>
          <text fg={ACCENT} attributes={TextAttributes.BOLD}>
            {inlineNodes(token.tokens, key)}
          </text>
        </box>
      );
    case "paragraph":
    case "text":
      return (
        <box key={key} marginBottom={1}>
          <text fg={FG}>{inlineNodes(token.tokens, key)}</text>
        </box>
      );
    case "list":
      return (
        <box key={key} flexDirection="column" marginBottom={1}>
          {token.items.map((item: Tokens.ListItem, itemIndex: number) => (
            <text key={`${key}-${itemIndex}`} fg={FG}>
              <span fg={DIM}>{token.ordered ? `${Number(token.start || 1) + itemIndex}.` : "•"}</span>
              {" "}
              {listItemNodes(item, `${key}-${itemIndex}`)}
            </text>
          ))}
        </box>
      );
    case "blockquote":
      return (
        <box key={key} paddingLeft={1} border={["left"]} borderColor={DIM} marginBottom={1}>
          <text fg={DIM}>{inlineNodes(token.tokens, key)}</text>
        </box>
      );
    case "code":
      return (
        <box key={key} marginBottom={1}>
          <text fg={DIM}>{token.text}</text>
        </box>
      );
    case "hr":
      return <text key={key} fg={DIM}>{"─".repeat(24)}</text>;
    default:
      if ("tokens" in token && Array.isArray(token.tokens)) {
        return <text key={key} fg={FG}>{inlineNodes(token.tokens, key)}</text>;
      }
      return <text key={key} fg={FG}>{token.raw}</text>;
  }
}

export function MarkdownView({ content }: { content: string }) {
  const tokens = marked.lexer(content, { gfm: true });
  return <box flexDirection="column">{tokens.map(blockNode)}</box>;
}
