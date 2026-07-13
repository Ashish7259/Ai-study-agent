import "./globals.css";

export const metadata = {
  title: "Study Agent",
  description: "A multi-agent study assistant: research, summarize, quiz",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
