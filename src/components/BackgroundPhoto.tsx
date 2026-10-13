import Image from "next/image";
import { getResponsiveImgStyle } from "@/lib/imageHelper";

/** Keep the configured crops while serving smaller photographs to small screens. */
export default function BackgroundPhoto({ config, slot, fallback, eager = false, children }: {
  config: Record<string, any>;
  slot: string;
  fallback: string;
  eager?: boolean;
  children?: React.ReactNode;
}) {
  const value = config?.[slot];
  const src = typeof value === "string" ? value : value?.url || fallback;
  return (
    <div className="wedding-photo-background absolute md:fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <Image
        src={src}
        alt=""
        fill
        sizes="100vw"
        loading={eager ? "eager" : "lazy"}
        fetchPriority={eager ? "high" : "auto"}
        unoptimized={!src.startsWith("/") || src.startsWith("//")}
        className="responsive-img-style object-cover"
        style={getResponsiveImgStyle(config, slot)}
      />
      {children}
    </div>
  );
}
