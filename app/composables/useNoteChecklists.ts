interface NoteChecklistItem {
  id: string
  note_id: string
  content: string
  is_completed: boolean
  position: number
  created_at: string
  updated_at: string
}

interface ListResponse<T> {
  message: string
  data: T
}

interface SingleResponse<T> {
  message: string
  data: T
}

export const useNoteChecklists = () => {
  const api = useApi()

  const fetchChecklists = async (noteId: string) => {
    const response = await api<ListResponse<NoteChecklistItem[]>>(`/notes/${noteId}/checklists`)
    return response.data
  }

  const createChecklistItem = async (noteId: string, content: string, isCompleted = false) => {
    const response = await api<SingleResponse<NoteChecklistItem>>(`/notes/${noteId}/checklists`, {
      method: 'POST',
      body: { content, is_completed: isCompleted },
    })
    return response.data
  }

  const updateChecklistItem = async (
    noteId: string,
    checklistId: string,
    payload: Partial<{ content: string; is_completed: boolean }>
  ) => {
    const response = await api<SingleResponse<NoteChecklistItem>>(`/notes/${noteId}/checklists/${checklistId}`, {
      method: 'PUT',
      body: payload,
    })
    return response.data
  }

  const deleteChecklistItem = async (noteId: string, checklistId: string) => {
    await api(`/notes/${noteId}/checklists/${checklistId}`, { method: 'DELETE' })
  }

  return {
    fetchChecklists,
    createChecklistItem,
    updateChecklistItem,
    deleteChecklistItem,
  }
}