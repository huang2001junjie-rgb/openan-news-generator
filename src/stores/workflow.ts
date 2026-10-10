import { create } from 'zustand'
import { createClient, isConfigComplete, ApiError } from '../lib/openai-client'
import { buildArticleMessages, buildCoverPrompt } from '../lib/prompts'
import { extractJson, findMissingVerbatim, normalizeArticle } from '../lib/template-engine'
import type {
  CoverSource,
  GeneratedArticle,
  ModelConfig,
  NewsInput,
  PendingGeneration,
  ToastKind,
  ToastMsg,
} from '../types'

const ENV_CONFIG: ModelConfig = {
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '',
  apiKey: import.meta.env.VITE_API_KEY ?? '',
  chatModel: import.meta.env.VITE_CHAT_MODEL ?? '',
  imageModel: import.meta.env.VITE_IMAGE_MODEL ?? '',
}

function formatToday(): string {
  return new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/** 工作台状态：无线性步骤，面板常驻；就绪度全部由以下事实派生（见 ADR-0003） */
export interface WorkflowState {
  config: ModelConfig
  /** 素材栏表单的实时状态 */
  input: NewsInput
  /** 最近一次提交生成时的素材快照（「重新生成」使用它而非实时表单） */
  lastInput: NewsInput
  generating: boolean
  streamingText: string
  article: GeneratedArticle | null
  missingVerbatim: string[]
  generationError: string
  /** 已有稿件时的覆盖式生成请求，等待确认框放行 */
  pendingGeneration: PendingGeneration | null
  coverDataUrl: string | null
  coverSource: CoverSource
  coverLoading: boolean
  coverError: string
  toasts: ToastMsg[]

  toast: (kind: ToastKind, text: string) => void
  dismissToast: (id: number) => void
  setInput: (patch: Partial<NewsInput>) => void
  requestGeneration: (input: NewsInput, extraInstruction?: string) => void
  confirmPendingGeneration: () => void
  cancelPendingGeneration: () => void
  startGeneration: (input: NewsInput, extraInstruction?: string) => void
  cancelGeneration: () => void
  updateArticle: (article: GeneratedArticle) => void
  uploadCover: (dataUrl: string) => void
  generateCover: () => void
  removeCover: () => void
  reset: () => void
}

/* 就绪度派生选择器（术语表：素材已填 / 稿件已生成 / 标题就绪 / 封面已就位 / 可导出） */
export const selectMaterialReady = (s: WorkflowState): boolean => s.input.outline.trim().length > 0
export const selectArticleReady = (s: WorkflowState): boolean => s.article !== null
export const selectTitleReady = (s: WorkflowState): boolean =>
  s.article !== null && s.article.title.trim().length > 0
export const selectCoverReady = (s: WorkflowState): boolean => s.coverDataUrl !== null
export const selectExportable = (s: WorkflowState): boolean =>
  s.article !== null && s.missingVerbatim.length === 0

let toastSeq = 0
let chatAbort: AbortController | null = null
let imageAbort: AbortController | null = null

export const useWorkflow = create<WorkflowState>()((set, get) => ({
  config: ENV_CONFIG,
  input: { title: '', outline: '', verbatim: [], length: 'short' },
  lastInput: { title: '', outline: '', verbatim: [], length: 'short' },
  generating: false,
  streamingText: '',
  article: null,
  missingVerbatim: [],
  generationError: '',
  pendingGeneration: null,
  coverDataUrl: null,
  coverSource: null,
  coverLoading: false,
  coverError: '',
  toasts: [],

  toast: (kind, text) => {
    const id = ++toastSeq
    set((s) => ({ toasts: [...s.toasts, { id, kind, text }] }))
    setTimeout(() => get().dismissToast(id), 4500)
  },

  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  setInput: (patch) => set((s) => ({ input: { ...s.input, ...patch } })),

  /** 生成入口：已有稿件时先弹覆盖确认，无稿件直接生成（ADR-0003 覆盖保护） */
  requestGeneration: (input, extraInstruction) => {
    if (get().article) {
      set({ pendingGeneration: { input, extraInstruction } })
    } else {
      get().startGeneration(input, extraInstruction)
    }
  },

  confirmPendingGeneration: () => {
    const pending = get().pendingGeneration
    set({ pendingGeneration: null })
    if (pending) get().startGeneration(pending.input, pending.extraInstruction)
  },

  cancelPendingGeneration: () => set({ pendingGeneration: null }),

  startGeneration: (input, extraInstruction) => {
    const { config, toast } = get()
    if (!isConfigComplete(config)) {
      toast('error', '模型配置不完整，请检查 .env 文件中的 VITE_API_BASE_URL、VITE_API_KEY、VITE_CHAT_MODEL')
      return
    }
    chatAbort?.abort()
    const controller = new AbortController()
    chatAbort = controller
    const client = createClient(config)

    set({
      generating: true,
      lastInput: input,
      streamingText: '',
      generationError: '',
    })

    // rAF 合帧刷新，避免 SSE 高频块导致过度 re-render
    let pending = ''
    let rafId = 0
    const flush = () => {
      rafId = 0
      if (pending) {
        const chunk = pending
        pending = ''
        set((s) => ({ streamingText: s.streamingText + chunk }))
      }
    }
    const onDelta = (text: string) => {
      pending += text
      if (!rafId) rafId = requestAnimationFrame(flush)
    }

    const messages = buildArticleMessages(input, formatToday(), extraInstruction)
    client
      .chatStream(messages, onDelta, controller.signal)
      .then((full) => {
        if (rafId) cancelAnimationFrame(rafId)
        flush()
        const raw = extractJson(full)
        const article = raw ? normalizeArticle(raw, formatToday()) : null
        if (!article) {
          set({
            generating: false,
            streamingText: '',
            generationError: '模型返回内容无法解析为新闻稿 JSON，请重试或缩短概要。',
          })
          return
        }
        const missing = findMissingVerbatim(article, input.verbatim)
        set({ generating: false, article, streamingText: '', missingVerbatim: missing })
        if (missing.length) {
          toast('error', `有 ${missing.length} 段必须保留的原文未出现，请手动补回后再导出`)
        }
      })
      .catch((err: unknown) => {
        if (rafId) cancelAnimationFrame(rafId)
        const e = err as ApiError
        if (e?.kind === 'aborted') return
        console.error('生成失败', err)
        set({
          generating: false,
          streamingText: '',
          generationError: e instanceof ApiError ? `${e.message} — ${e.hint}` : '生成失败，请重试',
        })
      })
  },

  cancelGeneration: () => {
    chatAbort?.abort()
    chatAbort = null
    set({ generating: false, streamingText: '' })
  },

  updateArticle: (article) => {
    set({ article })
    set((s) => ({ missingVerbatim: findMissingVerbatim(article, s.lastInput.verbatim) }))
  },

  uploadCover: (dataUrl) => {
    imageAbort?.abort()
    set({ coverDataUrl: dataUrl, coverSource: 'upload', coverLoading: false, coverError: '' })
  },

  /** AI 绘封：硬前置为「标题就绪」（ADR-0003），始终手动触发 */
  generateCover: () => {
    const { config, article } = get()
    if (!article || !article.title.trim()) {
      set({ coverError: '需先生成标题：请先生成稿件，或在编辑栏手动填写标题' })
      return
    }
    if (!config.imageModel.trim()) {
      set({ coverError: '未配置图像模型：请在 .env 中设置 VITE_IMAGE_MODEL，或改为手动上传封面' })
      return
    }
    imageAbort?.abort()
    const controller = new AbortController()
    imageAbort = controller
    set({ coverLoading: true, coverError: '' })
    createClient(config)
      .generateImage(buildCoverPrompt(article.title), controller.signal)
      .then((dataUrl) => set({ coverDataUrl: dataUrl, coverSource: 'ai', coverLoading: false }))
      .catch((err: unknown) => {
        const e = err as ApiError
        if (e?.kind === 'aborted') return
        console.error('封面生成失败', err)
        set({
          coverLoading: false,
          coverError: e instanceof ApiError ? `${e.message} — ${e.hint}` : '封面生成失败，请重试',
        })
      })
  },

  removeCover: () => {
    imageAbort?.abort()
    imageAbort = null
    set({ coverDataUrl: null, coverSource: null, coverLoading: false, coverError: '' })
  },

  reset: () => {
    chatAbort?.abort()
    imageAbort?.abort()
    set({
      generating: false,
      streamingText: '',
      article: null,
      missingVerbatim: [],
      generationError: '',
      pendingGeneration: null,
      coverDataUrl: null,
      coverSource: null,
      coverLoading: false,
      coverError: '',
    })
  },
}))
