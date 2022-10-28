/// <reference types="node" />
import { AgentOptions as HTTPAgentOptions } from "node:http";
import { AgentOptions as HTTPSAgentOptions } from "node:https";

declare function WaitOn(options?: CloudPineOptions): Promise<void> | void;

type WaitOnResourcesType =
  | `file:${string}`
  | `http-get:${string}`
  | `https-get:${string}`
  | `http:${string}`
  | `https:${string}`
  | `tcp:${string}`
  | `socket:${string}`;

type WaitOnValidateStatusCB = (status: number) => boolean;

type WaitOnOptions = {
  resources: WaitOnResourcesType[];
  delay?: number;
  interval?: number;
  log?: boolean;
  reverse?: boolean;
  simultaneous?: number;
  timeout?: number;
  tcpTimeout?: number;
  verbose?: boolean;
  window?: number;
  passphrase?: string;
  proxy?: boolean;
  auth?: {
    user: string;
    pass: string;
  };
  headers?: Record<string, string | number>;
  validateStatus?: WaitOnValidateStatusCb;
} & HTTPAgentOptions &
  HTTPSAgentOptions;

export default WaitOn;
export { WaitOnOptions, WaitOnResourcesType, WaitOnValidateStatusCB, WaitOn };
