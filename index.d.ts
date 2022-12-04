/// <reference types="node" />
import { ProxyAgent } from 'undici';

type WaitOnCallback = (err?: Error) => unknown;

declare function WaitOn(
  options: WaitOnOptions,
  cb: WaitOnCallback
): Promise<boolean>;

declare function WaitOn(options: WaitOnOptions): Promise<boolean>;

type WaitOnProxyConfig = ProxyAgent.Options;

/**
 * @description Invoked when an unsuccessful response is received from resource
 */
type WaitOnEventHandler = (
  resource: WaitOnResourcesType,
  response: string
) => void;
/**
 * @description invoked when an invalid resource is encountered
 * @note It won't be invoked if the 'throwOnInvalidResource' option is on
 */
type WaitOnInvalidResourceEventHandler = (
  resource: WaitOnResourcesType
) => void;
/**
 * @description Invoked when the resource becomes available and stable
 */
type WaitOnDoneEventHandler = (resource: WaitOnResourcesType) => void;
/**
 * @description Invoked when an unexpected error or a timed out waiting for the resource
 * occurs
 */
type WaitOnErrorHandler = (resource: WaitOnResourcesType, error: Error) => void;

type WaitOnResourcesType =
  | `file:${string}`
  | `http-get:${string}`
  | `https-get:${string}`
  | `http:${string}`
  | `https:${string}`
  | `tcp:${string}`
  | `socket:${string}`;

// type WaitOnValidateStatusCallback = (status: number) => boolean;

type WaitOnOptions = {
  resources: WaitOnResourcesType[];
  throwOnInvalidResource?: boolean;
  delay?: number;
  interval?: number;
  timeout?: number;
  reverse?: boolean;
  simultaneous?: number;
  http?: {
    bodyTimeout?: number;
    headersTimeout?: number;
    maxRedirects?: number;
    followRedirect?: boolean;
    headers?: Record<string, string | number>;
  };
  socket?: {
    timeout?: number;
  };
  tcp?: {
    timeout?: number;
  };
  window?: number;
  proxy?: WaitOnProxyConfig;
  events?: {
    onInvalidResource?: WaitOnInvalidResourceEventHandler;
    onResourceTimeout?: WaitOnErrorHandler;
    onResourceError?: WaitOnErrorHandler;
    onResourceResponse?: WaitOnEventHandler;
    onResourceDone?: WaitOnDoneEventHandler;
  };
  validateStatus?: WaitOnValidateStatusCallback;
};

export default WaitOn;
export {
  WaitOnOptions,
  WaitOnProxyConfig,
  WaitOnResourcesType,
  WaitOnValidateStatusCallback,
  WaitOnCallback,
  WaitOn,
};
