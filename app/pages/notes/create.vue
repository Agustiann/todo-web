<template>
    <NuxtLayout>
        <div class="update-note">

            <div class="update-note__header">
                <div class="update-note__header-actions">
                    <button class="update-note__delete" type="button" @click="handleCancel">
                        Batal
                    </button>
                    <button class="update-note__save" type="button" :disabled="isSaving" @click="handleSave">
                        {{ isSaving ? 'Menyimpan...' : 'Simpan Catatan' }}
                    </button>
                </div>
            </div>

            <div class="update-note__card">
                <div class="update-note__meta">
                    <NoteFolderSelect v-model:folder-id="form.folderId" :folders="folders" />
                </div>

                <input v-model="form.title" class="update-note__title-input" placeholder="Judul...">

                <NoteImageSection :images="form.images" :max-images="MAX_IMAGES" :max-size-label="MAX_IMAGE_SIZE_LABEL"
                    :error="imageError" extra-hint="Gambar akan diunggah setelah catatan disimpan."
                    @select-files="handleImageSelected" @remove="removeImage" />

                <div class="update-note__section">
                    <textarea id="note-content" v-model="form.content" class="update-note__textarea" rows="6"
                        placeholder="Tulis catatan di sini..." />
                </div>

                <NoteChecklistSection ref="checklistSectionRef" :items="form.checklist"
                    hint="Checklist akan disimpan setelah catatan dibuat." @enter="handleChecklistEnter"
                    @blur="handleChecklistBlur" @remove="removeChecklistItem" />

                <div class="update-note__footer">
                    <span v-if="saveError" class="update-note__error">
                        {{ saveError }}
                    </span>
                </div>

            </div>

        </div>
    </NuxtLayout>
</template>

<script setup>
const router = useRouter()
const { fetchFolders } = useFolders()
const { createNote } = useNotes()
const { uploadImage } = useNoteImages()
const { createChecklistItem } = useNoteChecklists()
const { notifyNotesChanged } = useNotesSync()

const folders = ref([])
const checklistSectionRef = ref(null)

const form = reactive({
    title: '',
    folderId: null,
    content: '',
    checklist: [],
    images: [],
})

const isSaving = ref(false)
const saveError = ref('')
const imageError = ref('')

onMounted(async () => {
    try {
        folders.value = await fetchFolders()
    } catch {
    }
})

const createId = () => `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const removeChecklistItem = (id) => {
    form.checklist = form.checklist.filter(item => item.id !== id)
}

const handleChecklistEnter = (item) => {
    if (!item.content.trim()) return
    checklistSectionRef.value?.addItem()
}

const handleChecklistBlur = (item) => {
    if (!item.content.trim()) {
        removeChecklistItem(item.id)
    }
}

const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
})

const handleImageSelected = async (fileList) => {
    const files = Array.from(fileList)
    imageError.value = ''

    for (const file of files) {
        if (form.images.length >= MAX_IMAGES) {
            imageError.value = `Maksimal ${MAX_IMAGES} gambar`
            break
        }

        if (!file.type.startsWith('image/')) {
            imageError.value = `${file.name} bukan file gambar`
            continue
        }

        if (file.size > MAX_IMAGE_SIZE) {
            imageError.value = `${file.name} melebihi batas ${MAX_IMAGE_SIZE_LABEL}`
            continue
        }

        try {
            const dataUrl = await readFileAsDataUrl(file)
            form.images.push({
                id: createId(),
                name: file.name,
                src: dataUrl,
                file,
            })
        } catch {
            imageError.value = `Gagal membaca ${file.name}`
        }
    }
}

const removeImage = (id) => {
    form.images = form.images.filter(image => image.id !== id)
}

const handleSave = async () => {
    if (!form.title.trim()) {
        saveError.value = 'Judul catatan tidak boleh kosong'
        return
    }

    saveError.value = ''
    isSaving.value = true

    try {
        const note = await createNote({
            title: form.title.trim(),
            content: form.content?.trim() || null,
            folder_id: form.folderId,
        })

        const failedUploads = []
        for (const image of form.images) {
            try {
                await uploadImage(note.id, image.file)
            } catch {
                failedUploads.push(image.name)
            }
        }
        const failedChecklists = []
        for (const item of form.checklist) {
            const content = item.content.trim()
            if (!content) continue

            try {
                await createChecklistItem(note.id, content, item.isCompleted)
            } catch {
                failedChecklists.push(content)
            }
        }

        notifyNotesChanged()

        const failureMessages = []
        if (failedUploads.length) failureMessages.push(`gambar: ${failedUploads.join(', ')}`)
        if (failedChecklists.length) failureMessages.push(`checklist: ${failedChecklists.join(', ')}`)

        if (failureMessages.length) {
            alert(`Catatan tersimpan, tapi gagal menyimpan ${failureMessages.join('; ')}`)
        }

        router.push('/notes')
    } catch (error) {
        saveError.value = error?.data?.errors?.title?.[0]
            || error?.data?.message
            || 'Gagal membuat catatan, coba lagi'
    } finally {
        isSaving.value = false
    }
}

const handleCancel = () => {
    const hasContent = form.title.trim() || form.content.trim() || form.checklist.length || form.images.length
    if (hasContent) {
        const confirmed = confirm('Batalkan catatan ini? Perubahan yang belum disimpan akan hilang.')
        if (!confirmed) return
    }
    router.push('/notes')
}
</script>