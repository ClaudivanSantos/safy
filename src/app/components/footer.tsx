export function Footer({ onDonateClick }: { onDonateClick?: () => void }) {
  return (
    <footer className="shrink-0 border-t border-border bg-background/80 py-8">
      <div className="mx-auto max-w-4xl px-4 text-center text-sm text-foreground/70">
        <p className="font-medium text-foreground/90">
          Construído por quem também já foi liquidado.
        </p>
        <p className="mt-2">
          Safy é gratuito. Se isso te ajudou a evitar perdas,{" "}
          {onDonateClick ? (
            <button
              type="button"
              onClick={onDonateClick}
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              considere apoiar o projeto
            </button>
          ) : (
            "considere apoiar o projeto."
          )}
        </p>
      </div>
    </footer>
  );
}
