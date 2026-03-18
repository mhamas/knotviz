import { useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { CopyableCode, TabPills } from '@/components/sidebar'
import graphSchema from '@/lib/graphSchema.json'

type TabId = 'explanation' | 'schema' | 'examples'

const TABS: { id: TabId; label: string }[] = [
  { id: 'explanation', label: 'Explanation' },
  { id: 'schema', label: 'JSON Schema' },
  { id: 'examples', label: 'Examples' },
]

// ─── Example JSON ────────────────────────────────────────────────────────────

const EXAMPLE_MINIMAL = `{
  "version": "1",
  "nodes": [
    { "id": "1", "label": "Alice" },
    { "id": "2", "label": "Bob" }
  ],
  "edges": [
    { "source": "1", "target": "2" }
  ]
}`

const EXAMPLE_FULL = `{
  "version": "1",
  "nodes": [
    {
      "id": "node-1",
      "label": "Alice",
      "x": 0,
      "y": 0,
      "properties": {
        "age": 34,
        "active": true,
        "joined": "2021-03-15",
        "role": "admin"
      }
    },
    {
      "id": "node-2",
      "label": "Bob",
      "properties": {
        "age": 28,
        "active": false,
        "joined": "2023-11-02",
        "role": "user"
      }
    }
  ],
  "edges": [
    {
      "source": "node-1",
      "target": "node-2",
      "label": "knows",
      "weight": 0.8
    }
  ]
}`

// ─── Field extraction from schema ────────────────────────────────────────────

interface FieldRow {
  name: string
  type: string
  isRequired: boolean
  description: string
}

/**
 * Extract field rows from a JSON Schema "properties" + "required" definition.
 * Descriptions are read directly from the schema's `description` fields.
 *
 * @param properties - JSON Schema properties object.
 * @param required - List of required field names.
 * @returns Array of field rows for rendering.
 */
function extractFields(
  properties: Record<string, Record<string, unknown>> | undefined,
  required: string[] | undefined,
): FieldRow[] {
  if (!properties) return []
  const requiredSet = new Set(required ?? [])
  return Object.entries(properties).map(([name, schema]) => {
    const type = (schema.type as string) ?? 'unknown'
    const description = (schema.description as string) ?? ''
    return {
      name,
      type,
      isRequired: requiredSet.has(name),
      description,
    }
  })
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function FieldTable({ title, fields }: { title: string; fields: FieldRow[] }): React.JSX.Element {
  return (
    <section>
      <h3 className="mb-1.5 font-semibold text-slate-900">{title}</h3>
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="pb-1 pr-3 font-medium text-slate-500">Field</th>
            <th className="pb-1 pr-3 font-medium text-slate-500">Type</th>
            <th className="pb-1 pr-3 font-medium text-slate-500">Required</th>
            <th className="pb-1 font-medium text-slate-500">Description</th>
          </tr>
        </thead>
        <tbody className="text-slate-700">
          {fields.map((f, i) => (
            <tr
              key={f.name}
              className={i < fields.length - 1 ? 'border-b border-slate-100' : ''}
            >
              <td className="py-1.5 pr-3 font-mono text-blue-700">{f.name}</td>
              <td className="py-1.5 pr-3">{f.type}</td>
              <td className="py-1.5 pr-3">{f.isRequired ? 'Yes' : 'No'}</td>
              <td className="py-1.5">{f.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

// ─── Tab content ─────────────────────────────────────────────────────────────

function ExplanationTab({
  topLevelFields,
  nodeFields,
  edgeFields,
}: {
  topLevelFields: FieldRow[]
  nodeFields: FieldRow[]
  edgeFields: FieldRow[]
}): React.JSX.Element {
  return (
    <div className="space-y-4 text-sm">
      <FieldTable title="Top-level fields" fields={topLevelFields} />
      <FieldTable title="Node fields" fields={nodeFields} />
      <FieldTable title="Edge fields" fields={edgeFields} />

      <section className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
        <h4 className="mb-1 font-semibold text-slate-700">Notes</h4>
        <ul className="list-inside list-disc space-y-0.5">
          <li>
            ISO 8601 date strings (e.g. <code className="rounded bg-slate-200 px-1">2024-01-15</code>) in
            properties are auto-detected as dates.
          </li>
          <li>
            Missing property values are replaced with type defaults on load (number → 0, string →
            &quot;&quot;, boolean → false, date → 1970-01-01).
          </li>
          <li>Nodes without <code className="rounded bg-slate-200 px-1">x</code>/<code className="rounded bg-slate-200 px-1">y</code> are randomly positioned.</li>
        </ul>
      </section>
    </div>
  )
}

function SchemaTab({ schemaJson }: { schemaJson: string }): React.JSX.Element {
  return (
    <div className="space-y-2 text-sm">
      <p className="text-xs text-slate-500">
        Standard JSON Schema (draft-07). Compatible with any JSON Schema validator, LLM, or code generator.
      </p>
      <CopyableCode code={schemaJson} label="graphSchema.json" />
    </div>
  )
}

function ExamplesTab(): React.JSX.Element {
  return (
    <div className="space-y-4 text-sm">
      <section>
        <h3 className="mb-1.5 font-semibold text-slate-900">Minimal graph</h3>
        <p className="mb-2 text-xs text-slate-500">
          The simplest valid graph — just nodes with IDs and one edge.
        </p>
        <CopyableCode code={EXAMPLE_MINIMAL} label="minimal-graph.json" />
      </section>

      <section>
        <h3 className="mb-1.5 font-semibold text-slate-900">Full-featured graph</h3>
        <p className="mb-2 text-xs text-slate-500">
          Uses all available fields: labels, positions, typed properties, edge weights.
        </p>
        <CopyableCode code={EXAMPLE_FULL} label="full-graph.json" />
      </section>
    </div>
  )
}

// ─── Main dialog ─────────────────────────────────────────────────────────────

interface Props {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Large dialog with 3 tabs showing the graph JSON schema: a human-friendly
 * explanation, the raw JSON Schema, and copy-pasteable examples. All field
 * tables are derived from `src/lib/graphSchema.json`.
 *
 * @param props - Dialog open state and change handler.
 * @returns Schema dialog element.
 */
export function SchemaDialog({ isOpen, onOpenChange }: Props): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<TabId>('explanation')
  const schemaJson = useMemo(() => JSON.stringify(graphSchema, null, 2), [])

  const topLevelFields = useMemo(
    () =>
      extractFields(
        graphSchema.properties as unknown as Record<string, Record<string, unknown>>,
        graphSchema.required,
      ),
    [],
  )

  const nodeFields = useMemo(
    () =>
      extractFields(
        graphSchema.properties.nodes.items.properties as unknown as Record<
          string,
          Record<string, unknown>
        >,
        graphSchema.properties.nodes.items.required,
      ),
    [],
  )

  const edgeFields = useMemo(
    () =>
      extractFields(
        graphSchema.properties.edges.items.properties as unknown as Record<
          string,
          Record<string, unknown>
        >,
        graphSchema.properties.edges.items.required,
      ),
    [],
  )

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-6xl max-h-[90vh] flex flex-col overflow-hidden" showCloseButton>
        <DialogHeader>
          <DialogTitle>Graph JSON Schema</DialogTitle>
          <DialogDescription>
            Your graph file must be a JSON object matching this schema.
          </DialogDescription>
        </DialogHeader>

        <TabPills tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

        <div className="min-h-0 flex-1 overflow-y-auto">
          {activeTab === 'explanation' && (
            <ExplanationTab
              topLevelFields={topLevelFields}
              nodeFields={nodeFields}
              edgeFields={edgeFields}
            />
          )}
          {activeTab === 'schema' && <SchemaTab schemaJson={schemaJson} />}
          {activeTab === 'examples' && <ExamplesTab />}
        </div>
      </DialogContent>
    </Dialog>
  )
}
