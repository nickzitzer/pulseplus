export default function SchemaDiagram({ schema }) {
  return (
    <div className="schema-diagram">
      <pre>{JSON.stringify(schema, null, 2)}</pre>
    </div>
  )
} 