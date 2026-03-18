import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Hospoda systém",
    short_name: "Hospoda",
    description: "Pokladní systém pro hospodu",
    start_url: "/",
    display: "standalone",
    background_color: "#e2e8f0",
    theme_color: "#0f172a",
    lang: "cs",
    orientation: "portrait",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      }
      
    ],
  };
}