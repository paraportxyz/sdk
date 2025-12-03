import '@paraport/vue/style'
import { DisplayModes, Paraport, ParaportPlugin, useSdk } from '@paraport/vue'
import { createApp, h } from 'vue'
import type { MountOptions } from './types'

export function init({
	integratedTargetId,
	amount,
	chain,
	address,
	asset,
	chains,
	onSubmit,
	onCompleted,
	onReady,
	onAddFunds,
	getSigner,
	appearance,
	themeMode,
	endpoints,
	displayMode = DisplayModes.Integrated,
	...options
}: MountOptions) {
	const targetElement = document.querySelector(`#${integratedTargetId}`)

	if (!targetElement) {
		throw new Error(`Target element not found: ${integratedTargetId}`)
	}

	const app = createApp({
		render: () =>
			h(Paraport, {
				chain,
				amount,
				address,
				asset,
				chains,
				displayMode,
				appearance,
				themeMode,
				logLevel: options.logLevel,
				label: options.label,
				disabled: options.disabled,
				onReady,
				onAddFunds,
				onCompleted,
				onSubmit,
				getSigner,
				endpoints,
			}),
	})

	app.use(ParaportPlugin)
	app.mount(targetElement)

	return {
		update: (options: Pick<MountOptions, 'label' | 'disabled'>) => {
			const store = useSdk()
			if (options.label !== undefined) store.setLabel(options.label)
			if (options.disabled !== undefined) store.setDisabled(options.disabled)
		},
		destroy: () => app.unmount(),
	}
}
