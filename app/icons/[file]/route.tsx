import { ImageResponse } from "next/og";
import { ICON_COLORS, ICONS } from "@/lib/pwa/icons";

// App icons (see lib/pwa/icons.ts), rendered once at build time. The paths end in .png, so the
// auth proxy lets them through: a phone fetches them without a session.
export function generateStaticParams() {
  return Object.keys(ICONS).map((file) => ({ file }));
}

export async function GET(_request: Request, { params }: RouteContext<"/icons/[file]">) {
  const { file } = await params;
  const spec = ICONS[file];
  if (!spec) return new Response("Not found", { status: 404 });

  const { size, shape, markScale } = spec;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: ICON_COLORS.tile,
          borderRadius: shape === "rounded" ? size * 0.225 : 0,
        }}
      >
        {/* lucide's graduation-cap, the same mark as the header logo */}
        <svg
          width={size * markScale}
          height={size * markScale}
          viewBox="0 0 24 24"
          fill="none"
          stroke={ICON_COLORS.mark}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z" />
          <path d="M22 10v6" />
          <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5" />
        </svg>
      </div>
    ),
    { width: size, height: size },
  );
}
