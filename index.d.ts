/// <reference types="node" />
import { AgentOptions as HTTPAgentOptions } from "node:http";
import { AgentOptions as HTTPSAgentOptions } from "node:https";

declare function WaitOn(
  options?: WaitOnOptions,
  cb: WaitOnCallback
): Promise<void> | void;

type WaitOnCallback = (err?: Error) => unknown;

type WaitOnProxyConfig = {
  host?: string;
  protocol?: string;
  auth?: WaitOnOptions["auth"];
};

type WaitOnResourcesType =
  | `file:${string}`
  | `http-get:${string}`
  | `https-get:${string}`
  | `http:${string}`
  | `https:${string}`
  | `tcp:${string}`
  | `socket:${string}`;

type WaitOnValidateStatusCallback = (status: number) => boolean;

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
  proxy?: boolean | WaitOnProxyConfig;
  auth?: {
    user: string;
    pass: string;
  };
  headers?: Record<string, string | number>;
  validateStatus?: WaitOnValidateStatusCb;
  strictSSL?: boolean;
} & HTTPAgentOptions &
  HTTPSAgentOptions;

export default WaitOn;
export {
  WaitOnOptions,
  WaitOnProxyConfig,
  WaitOnResourcesType,
  WaitOnValidateStatusCallback,
  WaitOnCallback,
  WaitOn,
};
