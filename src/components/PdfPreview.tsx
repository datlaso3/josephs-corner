"use client";

export function PdfPreview({ url, title }: { url: string; title: string }) {
  return (
    <div className="rounded-xl overflow-hidden border border-ink-700 bg-ink-800 h-[80vh]">
      <object
        data={`${url}#toolbar=1&view=FitH`}
        type="application/pdf"
        className="w-full h-full"
        aria-label={`PDF preview of ${title}`}
      >
        <iframe src={url} title={title} className="w-full h-full" />
      </object>
    </div>
  );
}
