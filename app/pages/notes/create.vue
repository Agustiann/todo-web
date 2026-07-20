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
                    <div class="update-note__field">
                        <label for="note-folder">Folder</label>
                        <select id="note-folder" v-model="form.folderId">
                            <option :value="null">Tanpa folder</option>
                            <option v-for="folder in folders" :key="folder.id" :value="folder.id">
                                {{ folder.name }}
                            </option>
                        </select>
                    </div>
                </div>

                <input v-model="form.title" class="update-note__title-input" placeholder="Judul...">
                <div class="update-note__section">
                    <div class="update-note__section-header">
                        <label>Lampiran Gambar ({{ form.images.length }}/{{ MAX_IMAGES }})</label>
                        <button type="button" class="update-note__section-add" :disabled="!canAddImage"
                            @click="triggerImageUpload">
                            + Tambah gambar
                        </button>
                        <input ref="imageInputRef" type="file" accept="image/*" multiple
                            class="update-note__image-input" @change="handleImageSelected">
                    </div>

                    <p class="update-note__hint">
                        Maksimal {{ MAX_IMAGES }} gambar, masing-masing maksimal {{ MAX_IMAGE_SIZE_LABEL }}.
                        Gambar akan diunggah setelah catatan disimpan.
                    </p>

                    <span v-if="imageError" class="update-note__error">
                        {{ imageError }}
                    </span>

                    <div v-if="form.images.length" class="update-note__attachment-grid">
                        <div v-for="image in form.images" :key="image.id" class="update-note__attachment-item">
                            <img :src="image.src" :alt="image.name" class="update-note__attachment-preview">
                            <div class="update-note__attachment-meta">
                                <span class="update-note__attachment-name">{{ image.name }}</span>
                            </div>
                            <button type="button" class="update-note__attachment-remove" aria-label="Hapus gambar"
                                @click="removeImage(image.id)">
                                ×
                            </button>
                        </div>
                    </div>
                </div>

                <div class="update-note__section">
                    <div class="update-note__section-header">
                        <label for="note-content">Isi Catatan</label>
                    </div>
                    <textarea id="note-content" v-model="form.content" class="update-note__textarea" rows="6"
                        placeholder="Tulis catatan di sini..." />
                </div>

                <div class="update-note__section">
                    <div class="update-note__section-header">
                        <label>Checklist</label>
                        <button type="button" class="update-note__section-add" @click="addChecklistItem">
                            + Tambah checklist
                        </button>
                    </div>

                    <p class="update-note__hint">
                        Checklist akan disimpan setelah catatan dibuat.
                    </p>

                    <ul v-if="form.checklist.length" class="update-note__checklist">
                        <li v-for="item in sortedChecklist" :key="item.id" class="update-note__checklist-item"
                            :class="{ 'update-note__checklist-item--done': item.isCompleted }">
                            <input v-model="item.isCompleted" type="checkbox" class="update-note__checklist-checkbox">
                            <input v-model="item.content" type="text" class="update-note__checklist-input"
                                placeholder="Item checklist..." :ref="(el) => setChecklistInputRef(el, item.id)"
                                @keyup.enter="handleChecklistEnter(item)" @blur="handleChecklistBlur(item)"
                                @keydown.delete="handleChecklistBackspace(item, $event)">
                            <button type="button" class="update-note__checklist-remove" aria-label="Hapus item"
                                @click="removeChecklistItem(item.id)">
                                ×
                            </button>
                        </li>
                    </ul>
                    <p v-else class="update-note__empty-hint">
                        Belum ada checklist.
                    </p>
                </div>

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
const imageInputRef = ref(null)

onMounted(async () => {
    try {
        folders.value = await fetchFolders()
    } catch {
    }
})

const createId = () => `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
const checklistInputRefs = {}
const setChecklistInputRef = (el, id) => {
    if (el) checklistInputRefs[id] = el
    else delete checklistInputRefs[id]
}
const sortedChecklist = computed(() => {
    return [...form.checklist].sort((a, b) => {
        if (a.isCompleted === b.isCompleted) return 0
        return a.isCompleted ? 1 : -1
    })
})

const addChecklistItem = () => {
    const item = {
        id: createId(),
        content: '',
        isCompleted: false,
    }
    form.checklist.push(item)
    nextTick(() => {
        checklistInputRefs[item.id]?.focus()
    })
    return item
}

const removeChecklistItem = (id) => {
    form.checklist = form.checklist.filter(item => item.id !== id)
    delete checklistInputRefs[id]
}
const handleChecklistEnter = (item) => {
    if (!item.content.trim()) return
    addChecklistItem()
}
const handleChecklistBlur = (item) => {
    if (!item.content.trim()) {
        removeChecklistItem(item.id)
    }
}
const focusChecklistInputEnd = (id) => {
    nextTick(() => {
        const el = checklistInputRefs[id]
        if (!el) return
        el.focus()
        const len = el.value.length
        el.setSelectionRange(len, len)
    })
}
const handleChecklistBackspace = (item, e) => {
    if (item.content !== '') return
    e.preventDefault()

    const list = sortedChecklist.value
    const index = list.findIndex(i => i.id === item.id)
    const previous = index > 0 ? list[index - 1] : null

    if (previous) {
        focusChecklistInputEnd(previous.id)
    }

    removeChecklistItem(item.id)
}
const canAddImage = computed(() => form.images.length < MAX_IMAGES)
const triggerImageUpload = () => {
    if (!canAddImage.value) {
        imageError.value = `Maksimal ${MAX_IMAGES} gambar`
        return
    }
    imageInputRef.value?.click()
}

const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
})

const handleImageSelected = async (e) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
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