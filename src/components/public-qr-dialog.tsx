import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Download, QrCode } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export function PublicQrDialog({ projectId, projectName }: { projectId: string; projectName: string }) {
  const [open, setOpen] = useState(false);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [publicUrl, setPublicUrl] = useState("");

  useEffect(() => {
    if (!open || typeof window === "undefined") return;
    const url = `${window.location.origin}/registry/${projectId}`;
    setPublicUrl(url);
    QRCode.toDataURL(url, { width: 512, margin: 2, errorCorrectionLevel: "M" })
      .then(setDataUrl)
      .catch(() => setDataUrl(null));
  }, [open, projectId]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <QrCode className="size-4" />
          Public QR code
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Site placard QR code</DialogTitle>
          <DialogDescription>
            Print and place at the restoration site — it opens the public registry page for {projectName}.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
          <div className="rounded-xl border border-border/60 bg-background p-4">
            {dataUrl ? (
              <img
                src={dataUrl}
                alt={`QR code linking to the public registry page for ${projectName}`}
                className="size-56"
              />
            ) : (
              <div className="size-56 animate-pulse rounded bg-muted" />
            )}
          </div>
          <Input readOnly value={publicUrl} aria-label="Public registry URL" className="text-xs" />
          <div className="flex w-full gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => navigator.clipboard?.writeText(publicUrl)}
            >
              Copy link
            </Button>
            <Button asChild className="flex-1 gap-2" disabled={!dataUrl}>
              <a href={dataUrl ?? "#"} download={`${projectName.replace(/\s+/g, "-").toLowerCase()}-qr.png`}>
                <Download className="size-4" />
                Download
              </a>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
