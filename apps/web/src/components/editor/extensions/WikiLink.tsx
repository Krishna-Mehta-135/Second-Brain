import { mergeAttributes, Node, nodeInputRule } from "@tiptap/core";
import {
  ReactNodeViewRenderer,
  NodeViewWrapper,
  NodeViewProps,
} from "@tiptap/react";
import { FileText } from "lucide-react";
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

const WikiLinkComponent = (props: NodeViewProps) => {
  const { node } = props;
  const title = node.attrs.title;
  const { documents } = useDocuments();

  // Find matching doc by title (case-insensitive)
  const linkedDoc = documents.find(
    (d) => d.title.toLowerCase() === title.toLowerCase(),
  );

  return (
    <NodeViewWrapper
      as="span"
      className="inline-flex items-center gap-1 mx-1 px-1.5 py-0.5 rounded-md bg-[hsl(var(--sb-accent))]/10 text-[hsl(var(--sb-accent))] hover:bg-[hsl(var(--sb-accent))]/20 transition-colors cursor-pointer border border-[hsl(var(--sb-accent))]/20 align-middle"
    >
      <FileText className="h-3 w-3 shrink-0" />
      {linkedDoc ? (
        <Link
          href={`/documents/${linkedDoc.id}`}
          className="font-medium text-[13px] no-underline"
        >
          {title}
        </Link>
      ) : (
        <span
          className="font-medium text-[13px] opacity-70"
          title="Document not found"
        >
          {title}
        </span>
      )}
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
