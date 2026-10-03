import type { MockEngineStatus } from '@core/ports/runtime.port';

export const MOCK_ENGINE_PORT_NAME = 'mock-engine';

export type PanelToWorkerMessage = { type: 'sync'; tabId: number; profileId: string };

export type WorkerToPanelMessage = { type: 'status'; tabId: number } & MockEngineStatus;
