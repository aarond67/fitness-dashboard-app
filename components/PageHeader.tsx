import { AppNav } from "@/components/AppNav";

export function PageHeader({
  title,
  description
}: {
  title: string;
  description: string;
}) {
  return (
    <header className="topbar">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <AppNav />
    </header>
  );
}
