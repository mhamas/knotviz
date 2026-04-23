import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { CopyableCode } from '@/components/sidebar'
import { ExternalLink } from 'lucide-react'

// Docs live under /docs in production (same origin) and on :4321 in dev
// (separate Astro server). Prefix accordingly so every "Docs" link resolves.
const DOCS_ORIGIN = import.meta.env.DEV ? 'http://localhost:4321' : ''
const docsUrl = (path: string): string => `${DOCS_ORIGIN}${path}`

interface FormatEntry {
  name: string
  blurb: string
  example: string
  docsPath: string
  /** Optional second link (e.g. the JSON Schema anchor for the JSON row). */
  extraLink?: { label: string; path: string }
}

const FORMATS: FormatEntry[] = [
  {
    name: 'JSON',
    blurb: 'Native format. Full fidelity — every feature round-trips.',
    docsPath: '/docs/input-formats/json',
    extraLink: { label: 'Full JSON Schema', path: '/docs/input-formats/json#full-json-schema' },
    example: `{
  "version": "1",
  "nodes": [
    {
      "id": "alice",
      "label": "Alice",
      "properties": {
        "age": 34,
        "role": "engineer",
        "active": true,
        "joined": "2021-03-15",
        "tags": ["founder", "alumna"]
      }
    },
    {
      "id": "bob",
      "label": "Bob",
      "properties": {
        "age": 28,
        "role": "designer",
        "active": true,
        "joined": "2023-11-02",
        "tags": ["newbie"]
      }
    }
  ],
  "edges": [
    { "source": "alice", "target": "bob", "label": "mentors", "weight": 0.8 }
  ]
}`,
  },
  {
    name: 'CSV edge list',
    blurb: 'One file, one row per edge. Nodes auto-derived from source/target.',
    docsPath: '/docs/input-formats/csv-edge-list',
    example: `source,target,weight
alice,bob,0.8
bob,carol,1.2
alice,carol,0.3`,
  },
  {
    name: 'CSV pair',
    blurb: 'Two files: a nodes CSV with typed properties plus an edges CSV.',
    docsPath: '/docs/input-formats/csv-pair',
    example: `# nodes.csv
id,label,age:number,role,active:boolean,joined:date,tags
alice,Alice,34,engineer,true,2021-03-15,founder|alumna
bob,Bob,28,designer,true,2023-11-02,newbie
carol,Carol,41,engineer,false,2019-06-01,alumna|mentor

# edges.csv
source,target,weight
alice,bob,0.8
bob,carol,1.2`,
  },
  {
    name: 'GraphML',
    blurb: 'XML format used by Gephi, yEd, Cytoscape, and NetworkX.',
    docsPath: '/docs/input-formats/graphml',
    example: `<graphml>
  <key id="age"    for="node" attr.name="age"    attr.type="int"/>
  <key id="role"   for="node" attr.name="role"   attr.type="string"/>
  <key id="joined" for="node" attr.name="joined" attr.type="string"/>
  <key id="weight" for="edge" attr.name="weight" attr.type="double"/>
  <graph edgedefault="undirected">
    <node id="alice">
      <data key="age">34</data>
      <data key="role">engineer</data>
      <data key="joined">2021-03-15</data>
    </node>
    <node id="bob">
      <data key="age">28</data>
      <data key="role">designer</data>
      <data key="joined">2023-11-02</data>
    </node>
    <edge source="alice" target="bob"><data key="weight">0.8</data></edge>
  </graph>
</graphml>`,
  },
  {
    name: 'GEXF',
    blurb: "Gephi's native XML. Round-trips node positions via <viz:position>.",
    docsPath: '/docs/input-formats/gexf',
    example: `<gexf>
  <graph defaultedgetype="undirected">
    <attributes class="node">
      <attribute id="0" title="age"    type="integer"/>
      <attribute id="1" title="role"   type="string"/>
      <attribute id="2" title="joined" type="string"/>
    </attributes>
    <nodes>
      <node id="alice" label="Alice">
        <attvalues>
          <attvalue for="0" value="34"/>
          <attvalue for="1" value="engineer"/>
          <attvalue for="2" value="2021-03-15"/>
        </attvalues>
        <viz:position x="120" y="45"/>
      </node>
      <node id="bob" label="Bob">
        <attvalues>
          <attvalue for="0" value="28"/>
          <attvalue for="1" value="designer"/>
          <attvalue for="2" value="2023-11-02"/>
        </attvalues>
        <viz:position x="180" y="60"/>
      </node>
    </nodes>
    <edges>
      <edge source="alice" target="bob" weight="0.8"/>
    </edges>
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
        <div className="flex shrink-0 items-center gap-2">
          {entry.extraLink && (
            <a
              href={docsUrl(entry.extraLink.path)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:border-slate-300 hover:text-slate-900"
            >
              {entry.extraLink.label}
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
          <a
            href={docsUrl(entry.docsPath)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:border-slate-300 hover:text-slate-900"
          >
            Docs
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
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
            href={docsUrl('/docs/input-formats')}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium text-blue-700 hover:text-blue-900 hover:underline"
          >
            Full reference for all formats
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </DialogContent>
    </Dialog>
  )
}
