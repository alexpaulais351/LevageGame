import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function StepShell({
  numero,
  titre,
  description,
  children,
}: {
  numero: number;
  titre: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-primary">
          <span className="mr-2 text-vinci-rouge">{numero}.</span>
          {titre}
        </CardTitle>
        {description && <CardDescription className="text-foreground/70">{description}</CardDescription>}
      </CardHeader>
      <CardContent className="flex flex-col gap-5">{children}</CardContent>
    </Card>
  );
}

export function Grille({ children, cols = 2 }: { children: React.ReactNode; cols?: 2 | 3 }) {
  return (
    <div className={cols === 3 ? "grid gap-4 sm:grid-cols-2 2xl:grid-cols-3" : "grid gap-4 sm:grid-cols-2"}>
      {children}
    </div>
  );
}

export function SousTitre({ children }: { children: React.ReactNode }) {
  return <h3 className="border-b border-border pb-1 text-sm font-semibold uppercase tracking-wide text-primary">{children}</h3>;
}
