import { ImageResponse } from "next/og";

// Route segment config
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

// Generated app icon (favicon). Uses the brand mark: a rounded teal tile with "R".
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a8d6e",
          color: "#ffffff",
          fontSize: 40,
          fontWeight: 700,
          borderRadius: 16
        }}
      >
        R
      </div>
    ),
    { ...size }
  );
}
