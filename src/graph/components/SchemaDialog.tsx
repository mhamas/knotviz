import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { CopyableCode } from '@/components/sidebar'
import { ExternalLink } from 'lucide-react'

interface FormatEntry {
  name: string
  blurb: string
  example: string
  docsPath: string
  language: 'json' | 'csv' | 'xml'
}

const FORMATS: FormatEntry[] = [
  {
    name: 'JSON',
    blurb: 'Native format. Full fidelity — every feature round-trips.',
    docsPath: '/docs/input-formats/json',
    language: 'json',
    example: `{
  "version": "1",
  "nodes": [{ "id": "a" }, { "id": "b" }],
  "edges": [{ "source": "a", "target": "b" }]
}`,
  },
  {
    name: 'CSV edge list',
    blurb: 'One file, one row per edge. Nodes auto-derived from source/target.',
    docsPath: '/docs/input-formats/csv-edge-list',
    language: 'csv',
    example: `source,target,weight
a,b,0.8
b,c,1.2`,
  },
  {
    name: 'CSV pair',
    blurb: 'Two files: a nodes CSV with properties plus an edges CSV.',
    docsPath: '/docs/input-formats/csv-pair',
    language: 'csv',
    example: `# nodes.csv
id,label,age:number
a,Alice,34
b,Bob,28

# edges.csv
source,target
a,b`,
  },
  {
    name: 'GraphML',
    blurb: 'XML standard exported by Gephi, yEd, Cytoscape, and NetworkX.',
    docsPath: '/docs/input-formats/graphml',
    language: 'xml',
    example: `<graphml>
  <graph edgedefault="undirected">
    <node id="a"/>
    <node id="b"/>
    <edge source="a" target="b"/>
  </graph>
</graphml>`,
  },
  {
    name: 'GEXF',
    blurb: "Gephi's native XML. Round-trips node positions via <viz:position>.",
    docsPath: '/docs/input-formats/gexf',
    language: 'xml',
    example: `<gexf>
  <graph>
    <nodes><node id="a"/><node id="b"/></nodes>
    <edges><edge source="a" target="b"/></edges>
  </graph>
</gexf>`,
  },
]

function FormatRow({ entry }: { entry: FormatEntry }): React.JSX.Element {
  return (
    <section className="rounded-lg border border-slate-200 p-3">
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{entry.name}</h3>
          <p className="text-xs text-slate-500">{entry.blurb}</p>
        </div>
        <a
          href={entry.docsPath}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:border-slate-300 hover:text-slate-900"
        >
          Docs
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
      <CopyableCode code={entry.example} label={`${entry.name} example`} />
    </section>
  )
}

interface Props {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Thin overview dialog covering the five accepted input formats. Each format
 * shows a minimal example and a link to its full docs page. The full JSON
 * schema lives at /docs/input-formats/json, not in the app — this dialog is
 * intentionally a pointer, not a reference.
 *
 * @param props - Dialog open state and change handler.
 * @returns Formats dialog element.
 */
export function SchemaDialog({ isOpen, onOpenChange }: Props): React.JSX.Element {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[85vh] flex-col overflow-hidden sm:max-w-2xl"
        showCloseButton
      >
        <DialogHeader>
          <DialogTitle>Accepted formats</DialogTitle>
          <DialogDescription>
            Knotviz reads five formats. Pick the one that matches what you already have.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
          {FORMATS.map((entry) => (
            <FormatRow key={entry.name} entry={entry} />
          ))}
        </div>

        <div className="border-t border-slate-200 pt-3 text-center text-xs text-slate-500">
          <a
            href="/docs/input-formats"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium text-blue-700 hover:text-blue-900 hover:underline"
          >
            Full reference for all formats
            <ExternalLink className="h-3 w-3" />
          </a>
          <span className="mx-2 text-slate-300">·</span>
          <a
            href="/docs/input-formats/json#full-json-schema"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium text-blue-700 hover:text-blue-900 hover:underline"
          >
            Full JSON Schema
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </DialogContent>
    </Dialog>
  )
}
