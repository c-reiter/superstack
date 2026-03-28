"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { EyeIcon, EyeOffIcon, Loader2Icon, PencilLineIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { GraphCanvas } from "@/artifacts/graph/client";
import {
  OpenUIArtifactCanvas,
  parseOpenUIArtifactContent,
} from "@/artifacts/openui/client";
import { DataStreamHandler } from "@/components/chat/data-stream-handler";
import { useDataStream } from "@/components/chat/data-stream-provider";
import {
  CheckCircleFillIcon,
  ChevronDownIcon,
  PlusIcon,
} from "@/components/chat/icons";
import { Messages } from "@/components/chat/messages";
import { MultimodalInput } from "@/components/chat/multimodal-input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { initialArtifactData, useArtifact } from "@/hooks/use-artifact";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { buildInitialIntakeSystemInstruction } from "@/lib/superstack/intake";
import { isPlaceholderPatientName } from "@/lib/superstack/naming";
import type { PatientProfile, PatientRecord } from "@/lib/superstack/types";
import type { Attachment, ChatMessage } from "@/lib/types";
import { fetcher, fetchWithErrorHandlers, generateUUID } from "@/lib/utils";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const getPatientsApiPath = (patientId?: string, suffix = "") =>
  patientId
    ? `${BASE_PATH}/api/patients/${patientId}${suffix}`
    : `${BASE_PATH}/api/patients`;

function parseGraph(content: string) {
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

function hasPatientData(profile: PatientProfile, messages: ChatMessage[]) {
  const hasProfileContent = Boolean(
    profile.displayName ||
      profile.demographics.age ||
      profile.demographics.sex ||
      profile.demographics.height ||
      profile.demographics.weight ||
      profile.demographics.bodyComposition ||
      profile.demographics.occupation ||
      profile.diagnoses.length ||
      profile.medicalHistory.length ||
      profile.medications.length ||
      profile.supplements.length ||
      profile.hormones.length ||
      profile.peptides.length ||
      profile.symptoms.length ||
      profile.goals.length ||
      profile.vitals.length ||
      profile.labs.length ||
      profile.diagnostics.length ||
      profile.familyHistory.length ||
      profile.lifestyle.activity ||
      profile.lifestyle.sleep ||
      profile.lifestyle.diet ||
      profile.lifestyle.alcohol ||
      profile.lifestyle.nicotine ||
      profile.lifestyle.stress ||
      profile.lifestyle.notes ||
      profile.notes.length
  );

  const hasUserMessage = messages.some(
    (message) =>
      message.role === "user" &&
      message.parts.some(
        (part) =>
          (part.type === "text" && part.text.trim().length > 0) ||
          part.type === "file"
      )
  );

  return hasProfileContent || hasUserMessage;
}

function IntakeEmptyState({ patient }: { patient: PatientRecord }) {
  return (
    <div className="pointer-events-none mx-auto flex max-w-xl flex-col items-center px-6 text-center">
      <div className="rounded-2xl border border-border/50 bg-card/50 px-4 py-2 text-xs font-medium text-muted-foreground">
        Intake / profile build
      </div>
      <div className="mt-4 text-3xl font-semibold tracking-tight">
        Build out{" "}
        {isPlaceholderPatientName(patient.name) ? "this patient" : patient.name}
      </div>
      <div className="mt-3 text-sm leading-6 text-muted-foreground">
        Capture demographics, diagnoses, medications, supplements, hormones,
        peptides, symptoms, goals, vitals, labs, diagnostics, family history,
        activity, sleep, and anything else clinically useful.
      </div>
    </div>
  );
}

function ConsultEmptyState({ patient }: { patient: PatientRecord }) {
  return (
    <div className="pointer-events-none mx-auto flex max-w-xl flex-col items-center px-6 text-center">
      <div className="rounded-2xl border border-border/50 bg-card/50 px-4 py-2 text-xs font-medium text-muted-foreground">
        Consult mode
      </div>
      <div className="mt-4 text-3xl font-semibold tracking-tight">
        Consult on {patient.name}
      </div>
      <div className="mt-3 text-sm leading-6 text-muted-foreground">
        Ask about symptoms, redundancy in the stack, diagnostics to increase
        confidence, or tiered interventions sorted by relevance.
      </div>
    </div>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex h-dvh items-center justify-center bg-background text-sm text-muted-foreground">
      <Loader2Icon className="mr-2 size-4 animate-spin" /> {label}
    </div>
  );
}

function ArtifactPanel() {
  const { artifact, setArtifact } = useArtifact();
  const graph = useMemo(
    () => (artifact.kind === "graph" ? parseGraph(artifact.content) : null),
    [artifact.content, artifact.kind]
  );
  const openUIArtifact = useMemo(
    () =>
      artifact.kind === "openui"
        ? parseOpenUIArtifactContent(artifact.content)
        : null,
    [artifact.content, artifact.kind]
  );

  if (!artifact.isVisible) {
    return null;
  }

  const isGraphArtifact = artifact.kind === "graph";
  const panelTitle = isGraphArtifact
    ? "Interaction graph"
    : artifact.title || "OpenUI artifact";
  const panelSubtitle = isGraphArtifact
    ? "Current profile or recommendation view"
    : openUIArtifact?.view === "table"
      ? "Structured table artifact"
      : "Structured recommendation artifact";

  return (
    <aside className="hidden h-dvh w-[55%] shrink-0 border-l border-border/50 bg-sidebar xl:flex xl:flex-col">
      <div className="flex h-14 items-center justify-between border-t border-b border-border/50 px-5">
        <div>
          <div className="text-sm font-semibold tracking-tight">
            {panelTitle}
          </div>
          <div className="text-xs text-muted-foreground">{panelSubtitle}</div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            className="rounded-full"
            onClick={() =>
              setArtifact((current) => ({
                ...current,
                isVisible: false,
              }))
            }
            size="sm"
            type="button"
            variant="outline"
          >
            <EyeOffIcon className="size-4" />
            Hide artifact
          </Button>
        </div>
      </div>

      <div
        className={`min-h-0 flex-1 ${isGraphArtifact ? "overflow-hidden" : "overflow-auto"}`}
      >
        {isGraphArtifact && graph ? (
          <GraphCanvas graph={graph} />
        ) : artifact.kind === "openui" && openUIArtifact ? (
          <OpenUIArtifactCanvas artifact={openUIArtifact} />
        ) : (
          <div className="flex h-full items-center justify-center p-8 text-center text-sm text-muted-foreground">
            {isGraphArtifact
              ? "No graph yet. Ask to inspect the stack visually or open the current profile graph."
              : "No structured artifact yet. Ask for a table or a Level 0-5 recommendation artifact."}
          </div>
        )}
      </div>
    </aside>
  );
}

type PatientChatPaneProps = {
  patient: PatientRecord;
  mode: "intake" | "consult";
  isGraphVisible: boolean;
  onRefreshPatient: () => Promise<unknown>;
  onRefreshList: () => Promise<unknown>;
  onRegenerateGraph: () => Promise<void>;
  onShowCurrentGraph: () => void;
  onCanFinishSetupChange: (canFinish: boolean) => void;
};

function PatientChatPane({
  patient,
  mode,
  isGraphVisible,
  onRefreshPatient,
  onRefreshList,
  onRegenerateGraph,
  onShowCurrentGraph,
  onCanFinishSetupChange,
}: PatientChatPaneProps) {
  const { setDataStream } = useDataStream();
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const activeModelId = DEFAULT_CHAT_MODEL;

  const initialMessages = useMemo(
    () =>
      mode === "intake" ? patient.intakeMessages : patient.consultMessages,
    [mode, patient.consultMessages, patient.intakeMessages]
  );

  const {
    messages,
    setMessages,
    sendMessage,
    status,
    stop,
    regenerate,
    addToolApprovalResponse,
  } = useChat<ChatMessage>({
    id: `${mode}-${patient.id}`,
    messages: initialMessages,
    generateId: generateUUID,
    transport: new DefaultChatTransport({
      api: getPatientsApiPath(patient.id, `/${mode}`),
      fetch: fetchWithErrorHandlers,
      prepareSendMessagesRequest(request) {
        return {
          body: {
            messages: request.messages,
            selectedModelId: activeModelId,
          },
        };
      },
    }),
    onData: (dataPart) => {
      setDataStream((current) =>
        current ? [...current, dataPart] : [dataPart]
      );
    },
    onFinish: async () => {
      setMessages((currentMessages) =>
        currentMessages.filter((message) => message.role !== "system")
      );

      if (mode === "intake") {
        await onRefreshPatient();
        await onRefreshList();
      }
    },
  });

  const canFinishSetup = hasPatientData(patient.profile, messages);
  const hasAutoWelcomedRef = useRef(false);
  const graphRegenerationTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  useEffect(() => {
    onCanFinishSetupChange(canFinishSetup);
  }, [canFinishSetup, onCanFinishSetupChange]);

  useEffect(() => {
    if (mode !== "intake") {
      hasAutoWelcomedRef.current = false;
      return;
    }

    const hasVisibleConversation = messages.some(
      (message) => message.role !== "system"
    );

    if (
      hasVisibleConversation ||
      status !== "ready" ||
      hasAutoWelcomedRef.current
    ) {
      return;
    }

    hasAutoWelcomedRef.current = true;
    sendMessage({
      role: "system",
      parts: [
        {
          type: "text",
          text: buildInitialIntakeSystemInstruction(patient.name),
        },
      ],
    });
  }, [messages, mode, patient.name, sendMessage, status]);

  const hasMountedForGraphSchedulingRef = useRef(false);

  useEffect(() => {
    return () => {
      if (graphRegenerationTimeoutRef.current) {
        clearTimeout(graphRegenerationTimeoutRef.current);
        graphRegenerationTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!hasMountedForGraphSchedulingRef.current) {
      hasMountedForGraphSchedulingRef.current = true;
      return;
    }

    if (messages.length === 0) {
      return;
    }

    if (graphRegenerationTimeoutRef.current) {
      clearTimeout(graphRegenerationTimeoutRef.current);
    }

    graphRegenerationTimeoutRef.current = setTimeout(() => {
      onRegenerateGraph().catch((error) => {
        console.error("Failed to regenerate graph:", error);
      });
    }, 60_000);

    return () => {
      if (graphRegenerationTimeoutRef.current) {
        clearTimeout(graphRegenerationTimeoutRef.current);
        graphRegenerationTimeoutRef.current = null;
      }
    };
  }, [messages, onRegenerateGraph]);

  const topSlot =
    mode === "intake" && (patient.setupComplete || canFinishSetup) ? (
      <div className="text-center text-sm text-muted-foreground">
        If all patient info is entered, click the finish button to continue
        chatting about symptoms.
      </div>
    ) : null;

  return (
    <div className="flex min-w-0 flex-1 flex-col bg-sidebar">
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-background md:rounded-tl-[12px] md:border-t md:border-l md:border-border/40">
        {mode === "consult" && (
          <div className="flex justify-end px-4 pt-3 md:px-5">
            <div className="flex items-center gap-2">
              <div className="rounded-2xl border border-border/50 bg-card/40 px-3 py-2 text-xs text-muted-foreground">
                {patient.setupComplete ? "Setup complete" : "Setup in progress"}
              </div>

              {!isGraphVisible && (
                <Button
                  className="rounded-full"
                  disabled={!patient.currentGraph}
                  onClick={onShowCurrentGraph}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <EyeIcon className="size-4" />
                  Show current graph
                </Button>
              )}
            </div>
          </div>
        )}
        <Messages
          addToolApprovalResponse={addToolApprovalResponse}
          chatId={`${mode}-${patient.id}`}
          emptyState={
            mode === "intake" ? (
              <IntakeEmptyState patient={patient} />
            ) : (
              <ConsultEmptyState patient={patient} />
            )
          }
          isArtifactVisible={isGraphVisible}
          isLoading={false}
          isReadonly={false}
          messages={messages}
          regenerate={regenerate}
          selectedModelId={activeModelId}
          setMessages={setMessages}
          status={status}
          votes={undefined}
        />

        <div className="sticky bottom-0 z-1 mx-auto flex w-full max-w-4xl gap-2 bg-background px-2 pb-3 md:px-4 md:pb-4">
          <MultimodalInput
            attachments={attachments}
            chatId={`${mode}-${patient.id}`}
            input={input}
            isLoading={false}
            messages={messages}
            placeholder={
              mode === "intake"
                ? "Add patient details, corrections, meds, symptoms, labs, or upload files..."
                : "Ask about interactions, culprits, diagnostics, or interventions..."
            }
            selectedModelId={activeModelId}
            selectedVisibilityType="private"
            sendMessage={sendMessage}
            setAttachments={setAttachments}
            setInput={setInput}
            setMessages={setMessages}
            showSuggestedActions={false}
            status={status}
            stop={stop}
            topSlot={topSlot}
          />
        </div>
      </div>
    </div>
  );
}

export function SuperstackApp() {
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [modeOverride, setModeOverride] = useState<"intake" | "consult" | null>(
    null
  );
  const [creatingPatient, setCreatingPatient] = useState(false);
  const [liveCanFinishSetup, setLiveCanFinishSetup] = useState(false);
  const initialPatientCreationTriggeredRef = useRef(false);
  const { artifact, setArtifact } = useArtifact();

  const {
    data,
    isLoading,
    mutate: mutatePatients,
  } = useSWR<{
    patients: PatientRecord[];
  }>(getPatientsApiPath(), fetcher);

  const patients = data?.patients ?? [];

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("superstack:selected-patient");
    }
  }, []);

  useEffect(() => {
    if (patients.length === 0) {
      return;
    }

    const hasSelectedPatient = patients.some(
      (currentPatient) => currentPatient.id === selectedPatientId
    );

    if (!selectedPatientId || !hasSelectedPatient) {
      setSelectedPatientId(patients[0].id);
    }
  }, [patients, selectedPatientId]);

  const { data: patientData, mutate: mutatePatient } = useSWR<{
    patient: PatientRecord;
  }>(selectedPatientId ? getPatientsApiPath(selectedPatientId) : null, fetcher);

  const patient = patientData?.patient;
  const activeMode =
    modeOverride ?? (patient?.setupComplete ? "consult" : "intake");
  const canFinishSetup = patient
    ? hasPatientData(patient.profile, patient.intakeMessages) ||
      liveCanFinishSetup
    : false;

  const handleCreatePatient = useCallback(async () => {
    if (creatingPatient) {
      return;
    }

    setCreatingPatient(true);

    try {
      const response = await fetch(getPatientsApiPath(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error(`Failed to create patient: ${response.status}`);
      }

      const json = await response.json();
      const created = json.patient as PatientRecord;
      setSelectedPatientId(created.id);
      setModeOverride("intake");
      setArtifact(initialArtifactData);
      await mutatePatients();
    } catch (error) {
      initialPatientCreationTriggeredRef.current = false;
      throw error;
    } finally {
      setCreatingPatient(false);
    }
  }, [creatingPatient, mutatePatients, setArtifact]);

  useEffect(() => {
    if (isLoading || creatingPatient || patients.length > 0) {
      return;
    }

    if (initialPatientCreationTriggeredRef.current) {
      return;
    }

    initialPatientCreationTriggeredRef.current = true;
    handleCreatePatient().catch((error) => {
      console.error("Failed to create initial patient:", error);
    });
  }, [creatingPatient, handleCreatePatient, isLoading, patients.length]);

  useEffect(() => {
    if (!selectedPatientId) {
      return;
    }

    setModeOverride(null);
    setArtifact(initialArtifactData);
    setLiveCanFinishSetup(false);
  }, [selectedPatientId, setArtifact]);

  useEffect(() => {
    if (activeMode === "intake") {
      setArtifact((current) => ({
        ...current,
        isVisible: false,
      }));
    }
  }, [activeMode, setArtifact]);

  const handleRegenerateGraph = useCallback(async () => {
    if (!patient) {
      return;
    }

    await fetch(getPatientsApiPath(patient.id, "/graph"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selectedModelId: DEFAULT_CHAT_MODEL }),
    });

    await mutatePatient();
  }, [patient, mutatePatient]);

  function handleShowCurrentGraph() {
    if (!patient?.currentGraph) {
      return;
    }

    setArtifact({
      documentId: `profile-${patient.id}`,
      title: patient.currentGraph.title,
      kind: "graph",
      content: JSON.stringify(patient.currentGraph),
      isVisible: true,
      status: "idle",
      boundingBox: {
        top: 0,
        left: 0,
        width: 0,
        height: 0,
      },
    });
  }

  async function handleFinishSetup() {
    if (!patient) {
      return;
    }

    const response = await fetch(getPatientsApiPath(patient.id), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        setupComplete: true,
        selectedModelId: DEFAULT_CHAT_MODEL,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to finish setup: ${response.status}`);
    }

    const json = (await response.json()) as { patient: PatientRecord };

    await mutatePatient({ patient: json.patient }, { revalidate: false });
    await mutatePatients(
      (current) =>
        current
          ? {
              patients: current.patients.map((currentPatient) =>
                currentPatient.id === json.patient.id
                  ? json.patient
                  : currentPatient
              ),
            }
          : current,
      { revalidate: false }
    );

    setModeOverride("consult");

    const generateGraphAfterFinish = async () => {
      await fetch(getPatientsApiPath(patient.id, "/graph"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedModelId: DEFAULT_CHAT_MODEL }),
      });

      await Promise.all([mutatePatient(), mutatePatients()]);
    };

    generateGraphAfterFinish().catch((error) => {
      console.error("Failed to generate graph after finishing setup:", error);
    });
  }

  if (
    (isLoading && patients.length === 0) ||
    (patients.length === 0 && creatingPatient)
  ) {
    return <LoadingState label="Preparing patient intake…" />;
  }

  if (!patient) {
    return <LoadingState label="Loading patient…" />;
  }

  return (
    <>
      <div className="flex h-dvh w-full overflow-hidden bg-sidebar">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="grid h-14 grid-cols-[1fr_auto_1fr] items-center bg-sidebar px-3 md:px-5">
            <div />

            <div className="justify-self-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    className="min-w-[240px] justify-between gap-2 rounded-lg border-border/50 bg-background/70 text-muted-foreground shadow-none transition-none hover:text-foreground focus-visible:border-border/50 focus-visible:ring-0 active:translate-y-0"
                    variant="outline"
                  >
                    <span className="truncate text-left text-sm text-foreground">
                      {patient.name || "Select patient"}
                    </span>
                    <ChevronDownIcon size={16} />
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="center" className="min-w-[300px]">
                  {patients.map((currentPatient) => (
                    <DropdownMenuItem
                      className="group/item flex flex-row items-center justify-between gap-4 !transition-none"
                      key={currentPatient.id}
                      onSelect={() => setSelectedPatientId(currentPatient.id)}
                    >
                      <div className="flex flex-col items-start gap-1">
                        <div>{currentPatient.name}</div>
                        {currentPatient.summary ? (
                          <div className="max-w-[220px] truncate text-xs text-muted-foreground">
                            {currentPatient.summary}
                          </div>
                        ) : null}
                      </div>
                      <div className="text-foreground opacity-0 group-data-[highlighted]/item:opacity-100 group-data-[state=checked]/item:opacity-100">
                        {currentPatient.id === selectedPatientId ? (
                          <CheckCircleFillIcon />
                        ) : null}
                      </div>
                    </DropdownMenuItem>
                  ))}

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    className="flex flex-row items-center gap-2 !transition-none"
                    onSelect={() => {
                      handleCreatePatient().catch((error) => {
                        console.error("Failed to create patient:", error);
                      });
                    }}
                  >
                    <PlusIcon size={16} />
                    <span>
                      {creatingPatient ? "Creating patient..." : "New Patient"}
                    </span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="justify-self-end self-center flex items-center">
              {activeMode === "intake" ? (
                <Button
                  className="rounded-lg"
                  disabled={!patient.setupComplete && !canFinishSetup}
                  onClick={() => {
                    handleFinishSetup().catch((error) => {
                      console.error("Failed to finish patient setup:", error);
                    });
                  }}
                  size="default"
                  type="button"
                >
                  Finish patient setup
                </Button>
              ) : (
                <Button
                  className="rounded-lg"
                  onClick={() => setModeOverride("intake")}
                  size="default"
                  type="button"
                >
                  <PencilLineIcon className="size-4" />
                  Edit Patient
                </Button>
              )}
            </div>
          </div>

          <div className="flex min-h-0 flex-1 overflow-hidden rounded-tl-[12px]">
            <PatientChatPane
              isGraphVisible={artifact.isVisible}
              key={`${patient.id}-${activeMode}`}
              mode={activeMode}
              onCanFinishSetupChange={setLiveCanFinishSetup}
              onRefreshList={mutatePatients}
              onRefreshPatient={mutatePatient}
              onRegenerateGraph={handleRegenerateGraph}
              onShowCurrentGraph={handleShowCurrentGraph}
              patient={patient}
            />
            <ArtifactPanel />
          </div>
        </div>
      </div>

      <DataStreamHandler />
    </>
  );
}
