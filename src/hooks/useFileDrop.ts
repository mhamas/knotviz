import { useCallback, useEffect, useRef, useState } from 'react'

interface UseFileDropReturn {
  isDragOver: boolean
  isConfirmOpen: boolean
  handleConfirm: () => void
  handleCancel: () => void
}

/**
 * Manages drag-and-drop file loading with a confirmation dialog.
 * Tracks drag overlay visibility and stores the pending file until confirmed.
 *
 * @param onLoadNewFile - Callback to load the confirmed file.
 * @returns Drag state, confirmation state, and confirm/cancel handlers.
 */
export function useFileDrop(onLoadNewFile: (file?: File) => void): UseFileDropReturn {
  const [isDragOver, setIsDragOver] = useState(false)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const dragCounterRef = useRef(0)
  const pendingFileRef = useRef<File | null>(null)

  useEffect(() => {
    const handleDragEnter = (e: DragEvent): void => {
      e.preventDefault()
      dragCounterRef.current++
      if (dragCounterRef.current === 1) setIsDragOver(true)
    }
    const handleDragOver = (e: DragEvent): void => {
      e.preventDefault()
    }
    const handleDragLeave = (e: DragEvent): void => {
      e.preventDefault()
      dragCounterRef.current--
      if (dragCounterRef.current === 0) setIsDragOver(false)
    }
    const handleDrop = (e: DragEvent): void => {
      e.preventDefault()
      dragCounterRef.current = 0
      setIsDragOver(false)
      const file = e.dataTransfer?.files[0]
      if (file) {
        pendingFileRef.current = file
        setIsConfirmOpen(true)
      }
    }

    window.addEventListener('dragenter', handleDragEnter)
    window.addEventListener('dragover', handleDragOver)
    window.addEventListener('dragleave', handleDragLeave)
    window.addEventListener('drop', handleDrop)
    return (): void => {
      window.removeEventListener('dragenter', handleDragEnter)
      window.removeEventListener('dragover', handleDragOver)
      window.removeEventListener('dragleave', handleDragLeave)
      window.removeEventListener('drop', handleDrop)
    }
  }, [])

  const handleConfirm = useCallback((): void => {
    setIsConfirmOpen(false)
    const file = pendingFileRef.current
    pendingFileRef.current = null
    onLoadNewFile(file ?? undefined)
  }, [onLoadNewFile])

  const handleCancel = useCallback((): void => {
    setIsConfirmOpen(false)
    pendingFileRef.current = null
  }, [])

  return { isDragOver, isConfirmOpen, handleConfirm, handleCancel }
}
