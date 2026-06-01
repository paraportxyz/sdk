import type { TPapiTransaction } from '@paraspell/sdk'
import type { PolkadotSigner, TxEvent } from 'polkadot-api'
import {
	type TransactionCallback,
	type TransactionStatus,
	TransactionStatuses,
	type TransactionUnsubscribe,
} from '@/types/transactions'

/**
 * Maps low-level TxEvent to a TransactionStatus used by the SDK.
 * @param event - Polkadot API transaction event
 * @returns Derived transaction status
 */
const resolveStatus = (event: TxEvent): TransactionStatus => {
	if (event.type === 'broadcasted') {
		return TransactionStatuses.Broadcast
	}

	if (event.type === 'signed') {
		return TransactionStatuses.Casting
	}

	if (event.type === 'txBestBlocksState') {
		return TransactionStatuses.Block
	}

	if (event.type === 'finalized') {
		return TransactionStatuses.Finalized
	}

	return TransactionStatuses.Unknown
}

/**
 * Signs, submits and watches a transaction, translating events into
 * TransactionCallback invocations.
 *
 * @param params.transaction - Prepared PAPI transaction
 * @param params.callback - Callback receiving status updates
 * @param params.signer - Signer implementation to sign the transaction
 * @returns Unsubscribe function for the watcher
 */
export const signAndSend = async ({
	transaction,
	callback,
	signer,
}: {
	transaction: TPapiTransaction
	callback: TransactionCallback
	signer: PolkadotSigner
}): Promise<TransactionUnsubscribe> => {
	if (!signer) {
		throw new Error('Signer is required')
	}

	let txHash = ''

	const subscription = transaction.signSubmitAndWatch(signer).subscribe({
		next: (event) => {
			const status = resolveStatus(event)
			txHash = event.txHash.toString()

			// on result
			if (
				status !== TransactionStatuses.Finalized &&
				!(
					event.type === 'txBestBlocksState' &&
					event.found &&
					event.dispatchError
				)
			) {
				callback({
					status,
					txHash,
				})
			}

			if (event.type === 'finalized') {
				callback({
					status: TransactionStatuses.Finalized,
					txHash,
					error: event.dispatchError?.type,
				})
			}
		},
		error: (error) => {
			callback({
				status: TransactionStatuses.Block,
				error: error.toString(),
				txHash: txHash,
			})
		},
	})

	// Return a bound unsubscribe to preserve context
	return () => subscription.unsubscribe()
}
