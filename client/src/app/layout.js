// app/layout.js (or wherever your RootLayout is)
import "./globals.css";

export const metadata = {
  title: "Noorul Islam College - Timetable Admin",
  description: "College timetable management system",
  icons: {
    icon: "/niicon.png",   // path relative to public/
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}