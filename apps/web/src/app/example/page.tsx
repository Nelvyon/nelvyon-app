import { ExampleWidget } from "@/features/example/components/ExampleWidget";

export default function ExamplePage() {
  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="text-xl font-semibold">Example Feature</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Vertical-slice toy domain to demonstrate the F1 structure.
      </p>
      <div className="mt-4">
        <ExampleWidget />
      </div>
    </main>
  );
}
