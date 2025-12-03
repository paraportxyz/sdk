import type { SDKConfig, TeleportParams, TeleportSessionPayload, TransactionType } from '@paraport/core'

export const DisplayModes = {
  Integrated: 'integrated',
  // Modal: 'modal',
} as const

export type DisplayMode = (typeof DisplayModes)[keyof typeof DisplayModes]

export const TeleportStepStatuses = {
  Failed: 'failed',
  Cancelled: 'cancelled',
  Completed: 'completed',
  Waiting: 'waiting',
  Loading: 'loading',
} as const

export type TeleportStepStatus
  = (typeof TeleportStepStatuses)[keyof typeof TeleportStepStatuses]

export type TeleportStepType = TransactionType | 'balance-check'

export interface TeleportStep {
  id: string
  status: TeleportStepStatus
  isError?: boolean
  isActive: boolean
  txHash?: string
  type: TeleportStepType
  duration?: number
}

export type TeleportStepDetails = TeleportStep & {
  statusLabel: string
}

type ClientSDKConfig = SDKConfig<false>

export interface CoreConfigParams {
  /**
   * Function to get the signer for transactions. Typically returns a Web3 provider
   * that can sign transactions on the source chain.
   */
  getSigner: ClientSDKConfig['getSigner']

  /**
   * Log level for the SDK.
   * @default 'INFO'
   */
  logLevel?: ClientSDKConfig['logLevel']

  /**
   * Endpoints for the SDK.
   */
  endpoints?: ClientSDKConfig['endpoints']

  /**
   * chains for the SDK.
   */
  chains?: ClientSDKConfig['chains']
}

export type ParaportParams = TeleportParams<string>
  & CoreConfigParams & {
    /**
     * Controls how the UI is displayed. Currently supports 'integrated' mode
     * which embeds the UI directly in the specified element.
     * @default DisplayMode.Integrated
     */
    displayMode?: DisplayMode

    /**
     * Controls how the UI is displayed.
     * @default true
     */
    ui?: {
      /**
       * Controls whether the add funds button is displayed.
       * @default true
       */
      addFunds?: boolean
    }

    /**
     * Per-instance CSS variable overrides for theming.
     * Keys should be CSS custom properties (e.g., '--radius', '--accent-blue').
     */
    appearance?: Record<string, string>

    /**
     * Theme mode control for design tokens.
     * - 'auto' follows system preference
     * - 'light' forces light tokens
     * - 'dark' forces dark tokens
     * @default 'auto'
     */
    themeMode?: 'light' | 'dark' | 'auto'

    /**
     * Text label for the teleport button/widget.
     */
    label?: string

    /**
     * Whether the teleport interface is disabled.
     * @default false
     */
    disabled?: boolean
  }

export interface ParaportEvents {
  /**
   * Callback fired when user submits the teleport form.
   * @param params - Object containing the autotelport status and completion status.
   */
  submit: [params: { autoteleport: boolean, completed: boolean }]

  /**
   * Callback fired when the teleport operation completes successfully.
   */
  completed: []

  /**
   * Callback fired when the UI is ready for interaction.
   */
  ready: [session: TeleportSessionPayload]

  /**
   * Callback fired when the user clicks adds funds.
   */
  addFunds: []
}
