import { createStore } from "zustand/vanilla";

type OperationUI = {
  selected: string;
  editing: string;
  editingDetails: string;
  historyId: string;
};

// A fresh store per page mount: UI selections never persist between users.
export const createOperationUIStore = () => createStore<OperationUI>(() => ({ selected: "", editing: "", editingDetails: "", historyId: "" }));
