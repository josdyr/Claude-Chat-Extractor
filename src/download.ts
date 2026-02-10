export function downloadMarkdown(markdown: string, title: string): void {
  const filename = sanitizeFilename(title);
  const date = new Date().toISOString().split("T")[0];
  const fullName = `${filename}_${date}.md`;

  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = fullName;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();

  // Cleanup
  setTimeout(() => {
    URL.revokeObjectURL(url);
    a.remove();
  }, 1000);
}

function sanitizeFilename(name: string): string {
  return (name || "untitled")
    .replace(/[^a-zA-Z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .toLowerCase()
    .slice(0, 80);
}
