// Model/provider/language selection state and its cycling logic, lifted out of
// App so the keyboard router only has to call `cycleSelection`/`cycleLanguage`.
// Selecting only sets intent — nothing runs until the user starts an analysis.

import { useRef, useState } from "react";
import {
  cycleModel,
  cycleProvider,
  LANGUAGES,
  listProviders,
  type Language,
  type ModelSelection,
  type ProviderInfo,
} from "../ai/llm";

export interface ModelSelectionControls {
  selection: ModelSelection;
  language: Language;
  providers: ProviderInfo[];
  activeProvider: ProviderInfo;
  /** `true` cycles the model within the provider; `false` cycles the provider. */
  cycleSelection: (withinProvider: boolean) => void;
  cycleLanguage: () => void;
}

export function useModelSelection(
  initialSelection: ModelSelection,
  initialLanguage: Language,
): ModelSelectionControls {
  const [selection, setSelection] = useState<ModelSelection>(initialSelection);
  const [language, setLanguage] = useState<Language>(initialLanguage);

  // Key availability is fixed for the process; compute the provider list once.
  const providers = useRef(listProviders()).current;
  const activeProvider = providers.find((p) => p.id === selection.providerId) ?? providers[0]!;

  const cycleSelection = (withinProvider: boolean) => {
    setSelection((current) => (withinProvider ? cycleModel(current) : cycleProvider(current)));
  };

  const cycleLanguage = () => {
    setLanguage((current) => {
      const i = LANGUAGES.indexOf(current);
      return LANGUAGES[(i + 1) % LANGUAGES.length]!;
    });
  };

  return { selection, language, providers, activeProvider, cycleSelection, cycleLanguage };
}
