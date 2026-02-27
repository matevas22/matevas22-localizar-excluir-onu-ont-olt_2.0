// --- Types ---

export interface UserData {
  id: number;
  username: string;
  role: "admin" | "tech";
}

export interface OnuResult {
  sn: string;
  olt: string;
  ip: string;
  interface: string;
  status: string;
  name?: string;
  distance?: string;
  uptime?: string;
  signals: {
    rxOnu: number;
    txOnu: number;
    rxOlt: number;
    txOlt: number;
  };
}

export interface PageState {
  sn: string;
  loading: boolean;
  result: OnuResult[] | OnuResult | null;
  controller: AbortController | null;
}

export interface PageProps {
  state: PageState;
  setState: React.Dispatch<React.SetStateAction<PageState>>;
}
