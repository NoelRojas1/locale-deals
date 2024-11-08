"use client";

import { Button } from "@/components/ui/button";
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { env } from "@/data/env/client";
import { CopyCheckIcon, CopyIcon, CopyXIcon } from "lucide-react";
import { useState } from "react";

enum CopyState {
  idle = "idle",
  copied = "copied",
  error = "error",
}
type TCopyState = keyof typeof CopyState;

export default function AddToSiteProductModalContent({ id }: { id: string }) {
  const [copyState, setCopyState] = useState<TCopyState>("idle");
  const code = `<script src="${env.NEXT_PUBLIC_SERVER_URL}/api/products/${id}/banner"></script>`;
  const Icon = getCopyIcon(copyState);

  return (
    <DialogContent className="max-w-max">
      <DialogHeader>
        <DialogTitle className="text-2xl">
          Start Earning Locale Deals Sales!
        </DialogTitle>
        <DialogDescription>
          All you need to do is copy the below script into your site and your
          customers will start seeing Locale Deals discounts
        </DialogDescription>
      </DialogHeader>

      <pre className="mb-4 overflow-x-auto p-4 bg-secondary rounded max-w-screen-xl text-secondary-foreground">
        <code>{code}</code>
      </pre>
      {/* Button to allow copying the code */}
      <div className="flex gap-2">
        <Button
          onClick={() => {
            navigator.clipboard
              .writeText(code)
              .then(() => {
                setCopyState(CopyState.copied);
                setTimeout(() => setCopyState(CopyState.idle), 2000);
              })
              .catch(() => {
                setCopyState(CopyState.error);
                setTimeout(() => setCopyState(CopyState.idle), 2000);
              });
          }}
        >
          {Icon && <Icon className="size-4 mr-2" />}
          {getChildren(copyState)}
        </Button>
        <DialogClose asChild>
          <Button variant="outline">Close</Button>
        </DialogClose>
      </div>
    </DialogContent>
  );
}

function getCopyIcon(copyState: TCopyState) {
  switch (copyState) {
    case CopyState.idle:
      return CopyIcon;
    case CopyState.copied:
      return CopyCheckIcon;
    case CopyState.error:
      return CopyXIcon;
  }
}

function getChildren(copyState: TCopyState) {
  switch (copyState) {
    case CopyState.idle:
      return "Copy Code";
    case CopyState.copied:
      return "Copied!";
    case CopyState.error:
      return "Error";
  }
}
