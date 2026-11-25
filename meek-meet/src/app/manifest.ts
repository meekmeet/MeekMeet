import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Meek Meet — Blessed Are The Meek",
    short_name: "Meek Meet",
    description:
      "A warm community of faith where the meek gather, share, and build something beautiful together.",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f0e6",
    theme_color: "#f5f0e6",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
