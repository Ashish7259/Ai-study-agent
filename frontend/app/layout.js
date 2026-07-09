export const metadata = {
  title: "AI Study Agent",
  description: "Multi-agent study assistant: research, summarize, quiz",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0 }}>
        {children}
      </body>
    </html>
  );
}
