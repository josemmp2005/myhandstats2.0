import Link from "next/link";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-8 flex items-center justify-center gap-2 text-lg font-semibold"
        >
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-petrol-bright text-sm font-bold text-bg">
            MH
          </span>
          MyHandStats
        </Link>

        <div className="rounded-2xl border border-border bg-surface/70 p-8 shadow-2xl backdrop-blur">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="mt-1 mb-6 text-sm text-muted">{subtitle}</p>
          {children}
        </div>

        <p className="mt-6 text-center text-sm text-muted">{footer}</p>
      </div>
    </main>
  );
}

export function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required
        className="w-full rounded-xl border border-border bg-bg/60 px-4 py-2.5 text-ink outline-none transition placeholder:text-muted/60 focus:border-cyan focus:ring-2 focus:ring-cyan/30"
      />
    </label>
  );
}
