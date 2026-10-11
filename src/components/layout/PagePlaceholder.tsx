export function PagePlaceholder({ titre }: { titre: string }) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-primary">{titre}</h1>
      <p className="mt-2 text-muted-foreground">À venir</p>
    </div>
  );
}
