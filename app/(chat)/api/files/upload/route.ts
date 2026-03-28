import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/app/(auth)/auth";

const allowedFileTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
];

const fileSchema = z.object({
  file: z.instanceof(Blob).refine((file) => file.size <= 10 * 1024 * 1024, {
    message: "File size should be less than 10MB",
  }),
  filename: z.string().min(1),
});

function inferContentType(filename: string, fileType: string) {
  if (allowedFileTypes.includes(fileType)) {
    return fileType;
  }

  const lower = filename.toLowerCase();

  if (lower.endsWith(".md") || lower.endsWith(".markdown")) {
    return "text/markdown";
  }
  if (lower.endsWith(".txt")) {
    return "text/plain";
  }
  if (lower.endsWith(".csv")) {
    return "text/csv";
  }
  if (lower.endsWith(".json")) {
    return "application/json";
  }
  if (lower.endsWith(".pdf")) {
    return "application/pdf";
  }
  if (lower.endsWith(".png")) {
    return "image/png";
  }
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) {
    return "image/jpeg";
  }
  if (lower.endsWith(".webp")) {
    return "image/webp";
  }

  return fileType;
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (request.body === null) {
    return new Response("Request body is empty", { status: 400 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as Blob;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const filename = (formData.get("file") as File).name;
    const validatedFile = fileSchema.safeParse({ file, filename });

    if (!validatedFile.success) {
      const errorMessage = validatedFile.error.errors
        .map((error) => error.message)
        .join(", ");

      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    const resolvedContentType = inferContentType(filename, file.type);

    if (!allowedFileTypes.includes(resolvedContentType)) {
      return NextResponse.json(
        {
          error:
            "File type should be PNG, JPEG, WEBP, PDF, TXT, Markdown, CSV, or JSON",
        },
        { status: 400 }
      );
    }

    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const fileBuffer = await file.arrayBuffer();

    try {
      const data = await put(`${safeName}`, fileBuffer, {
        access: "public",
        contentType: resolvedContentType,
        addRandomSuffix: true,
      });

      return NextResponse.json({
        ...data,
        pathname: data.pathname ?? safeName,
        contentType: resolvedContentType,
      });
    } catch (error) {
      console.error("Blob upload failed, falling back to data URL:", error);

      const base64 = Buffer.from(fileBuffer).toString("base64");
      const url = `data:${resolvedContentType};base64,${base64}`;

      return NextResponse.json({
        url,
        pathname: safeName,
        contentType: resolvedContentType,
      });
    }
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
