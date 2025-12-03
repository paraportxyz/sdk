import { useEffect, useRef } from 'react'
import './index.css'
import { init } from '@paraport/sdk'

type ParaportParams = Omit<Parameters<typeof init>[0], 'integratedTargetId'>

function Paraport({
  address,
  amount,
  chain,
  asset,
  chains,
  onSubmit,
  onCompleted,
  onReady,
  onAddFunds,
  displayMode,
  appearance,
  themeMode,
  label,
  disabled,
  getSigner,
  logLevel,
  endpoints,
}: ParaportParams) {
  const sdkInstanceRef = useRef<ReturnType<typeof init> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current || sdkInstanceRef.current) return

    const integratedTargetId = `paraport-${crypto.randomUUID().split('-')[0]}`
    containerRef.current.id = integratedTargetId

    const instance = init({
      // Required
      integratedTargetId,
      amount,
      address,
      chain,
      asset,
      chains,
      // Optional
      displayMode,
      appearance,
      themeMode,
      label,
      disabled,
      getSigner,
      logLevel,
      endpoints,
      // Events
      onSubmit,
      onCompleted,
      onReady,
      onAddFunds,
    })

    sdkInstanceRef.current = instance

    // Cleanup function
    return () => {
      if (sdkInstanceRef.current) {
        sdkInstanceRef.current.destroy()
        sdkInstanceRef.current = null
      }
    }
  })

  useEffect(() => {
    if (sdkInstanceRef.current) {
      sdkInstanceRef.current.update({
        label,
        disabled
      })
    }
  }, [label, disabled])

  return (
    <div ref={containerRef} />
  )
}

export default Paraport
