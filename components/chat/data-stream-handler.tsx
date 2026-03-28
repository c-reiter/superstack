"use client";

import { useEffect } from "react";
import { useSWRConfig } from "swr";
import { unstable_serialize } from "swr/infinite";
import { initialArtifactData, useArtifact } from "@/hooks/use-artifact";
import { artifactDefinitions } from "./artifact";

function getArtifactDefinitionForStreamPart(
  streamPartType: string,
  currentKind: string
) {
  switch (streamPartType) {
    case "data-textDelta":
    case "data-suggestion":
      return artifactDefinitions.find((definition) => definition.kind === "text");
    case "data-codeDelta":
      return artifactDefinitions.find((definition) => definition.kind === "code");
    case "data-imageDelta":
      return artifactDefinitions.find((definition) => definition.kind === "image");
    case "data-sheetDelta":
      return artifactDefinitions.find((definition) => definition.kind === "sheet");
    case "data-graphDelta":
      return artifactDefinitions.find((definition) => definition.kind === "graph");
    case "data-openuiDelta":
      return artifactDefinitions.find((definition) => definition.kind === "openui");
    case "data-recommendationDelta":
      return artifactDefinitions.find(
        (definition) => definition.kind === "recommendations"
      );
    default:
      return artifactDefinitions.find(
        (definition) => definition.kind === currentKind
      );
  }
}
import { useDataStream } from "./data-stream-provider";
import { getChatHistoryPaginationKey } from "./sidebar-history";

export function DataStreamHandler() {
  const { dataStream, setDataStream } = useDataStream();
  const { mutate } = useSWRConfig();

  const { artifact, setArtifact, setMetadata } = useArtifact();

  useEffect(() => {
    if (!dataStream?.length) {
      return;
    }

    const newDeltas = dataStream.slice();
    setDataStream([]);

    for (const delta of newDeltas) {
      if (delta.type === "data-chat-title") {
        mutate(unstable_serialize(getChatHistoryPaginationKey));
        continue;
      }
      const artifactDefinition = getArtifactDefinitionForStreamPart(
        delta.type,
        artifact.kind
      );

      if (artifactDefinition?.onStreamPart) {
        artifactDefinition.onStreamPart({
          streamPart: delta,
          setArtifact,
          setMetadata,
        });
      }

      setArtifact((draftArtifact) => {
        if (!draftArtifact) {
          return { ...initialArtifactData, status: "streaming" };
        }

        switch (delta.type) {
          case "data-id":
            return {
              ...draftArtifact,
              documentId: delta.data,
              status: "streaming",
            };

          case "data-title":
            return {
              ...draftArtifact,
              title: delta.data,
              status: "streaming",
            };

          case "data-kind":
            return {
              ...draftArtifact,
              kind: delta.data,
              status: "streaming",
            };

          case "data-clear":
            return {
              ...draftArtifact,
              content: "",
              status: "streaming",
            };

          case "data-finish":
            return {
              ...draftArtifact,
              status: "idle",
            };

          default:
            return draftArtifact;
        }
      });
    }
  }, [dataStream, setArtifact, setMetadata, artifact, setDataStream, mutate]);

  return null;
}
