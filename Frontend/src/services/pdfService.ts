import api from './api'

export interface UploadResponse { chatId: string }

const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2 MB

const pdfService = {
  validateFile(file: File): string | null {
    if (file.type !== 'application/pdf') {
      return 'Only PDF files are allowed.'
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File size must be under 2 MB.'
    }
    return null
  },

  async uploadPDF(
    file: File,
    onProgress?: (pct: number) => void,
  ): Promise<UploadResponse> {
    const formData = new FormData()
    formData.append('file', file)

    const res = await api.post<UploadResponse>('/pdf/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: e => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded / e.total) * 100))
        }
      },
    })

    return res.data
  },
}

export default pdfService