import { QueryArrayResult } from "pg";
import { NoticeMessage } from "pg-protocol/dist/messages";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ClientResult<T extends any[] = unknown[]>
  extends QueryArrayResult<T> {
  timing: number;
  notice?: NoticeMessage;
  transaction?: Transaction;
}

export enum TRANSACTION_STATE {
  RUNNING,
  ERROR,
  ENDED_SUCCESSFUL,
  ENDED_ERROR,
}

export interface Transaction {
  state: TRANSACTION_STATE;
  id: string;
}
