import { useMutation } from "@tanstack/react-query";
import { processAudio } from "./api";
import { ProcessAudioInput, ProcessAudioResult } from "./types";

type Args = {
  onSuccess: (result: ProcessAudioResult) => void;
  onError?: (error: Error) => void;
};

export function useProcessAudio({ onSuccess, onError }: Args) {
  return useMutation<ProcessAudioResult, Error, ProcessAudioInput>({
    mutationFn: processAudio,
    onSuccess,
    onError,
  });
}
