/* eslint-disable @next/next/no-img-element */

/** Logo Victor e Duda Fotografias. "ink" para fundos claros, "white" para fundos escuros. */
export function Logo({ name, height, variant = "ink", className }: { name: string; height: number; variant?: "ink" | "white"; className?: string }) {
  return (
    <img
      src={variant === "white" ? "/brand/logo-branca.png" : "/brand/logo.png"}
      alt={name}
      height={height}
      width={Math.round((height * 222) / 257)}
      className={className}
      style={{ height, width: "auto" }}
    />
  );
}
