interface ApiErrorResponse {
    data?: {
        errors?: Record<string, string[]>
        message?: string
    }
}

export const useApiError = () => {
    const errorMessage = ref('')
    function handleApiError(error: ApiErrorResponse) {
        const data = error?.data

        if (data?.errors) {
            errorMessage.value = Object.values(data.errors).flat().join(' ')
        } else {
            errorMessage.value = data?.message || 'Terjadi kesalahan, silakan coba lagi.'
        }
    }
    return { errorMessage, handleApiError }
}