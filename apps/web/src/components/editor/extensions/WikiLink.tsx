import { mergeAttributes, Node, nodeInputRule } from "@tiptap/core";
import {
  ReactNodeViewRenderer,
  NodeViewWrapper,
  NodeViewProps,
} from "@tiptap/react";
import { useDocuments } from "@/lib/documents/useDocuments";
import Link from "next/link";

export interface WikiLinkOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    wikiLink: {
      /**
       * Insert a wiki link
       */
      setWikiLink: (title: string) => ReturnType;
    };
  }
}

/** Inline [[Title]] — purple wiki syntax like the landing preview (brackets visible). */
const WikiLinkComponent = (props: NodeViewProps) => {
  const { node } = props;
  const title = String(node.attrs.title ?? "").trim() || "Untitled";
  const { documents } = useDocuments();

  const linkedDoc = documents.find(
    (d) => (d.title ?? "").toLowerCase() === title.toLowerCase(),
  );

  const label = `[[${title}]]`;

  if (linkedDoc) {
    return (
      <NodeViewWrapper as="span" className="inline align-baseline mx-0.5">
        <Link
          href={`/documents/${linkedDoc.id}`}
          className="text-[hsl(var(--sb-accent))] font-medium no-underline hover:text-[hsl(var(--sb-accent-glow))] hover:underline decoration-[hsl(var(--sb-accent))]/50"
        >
          {label}
        </Link>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper
      as="span"
      className="inline align-baseline mx-0.5 text-[hsl(var(--sb-accent))] font-medium opacity-75"
      title="No note with this title yet"
    >
      {label}
    </NodeViewWrapper>
  );
};

export const WikiLink = Node.create<WikiLinkOptions>({
  name: "wikiLink",
  group: "inline",
  inline: true,
  atom: true,

  addAttributes() {
    return {
      title: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="wiki-link"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-type": "wiki-link",
      }),
      `[[${HTMLAttributes.title}]]`,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(WikiLinkComponent);
  },

  addCommands() {
    return {
      setWikiLink:
        (title) =>
        ({ chain }) => {
          return chain()
            .insertContent({
              type: this.name,
              attrs: { title },
            })
            .run();
        },
    };
  },

  addInputRules() {
    return [
      nodeInputRule({
        find: /\[\[([^\]]+)\]\]$/,
        type: this.type,
        getAttributes: (match) => {
          return {
            title: match[1],
          };
        },
      }),
    ];
  },
});
