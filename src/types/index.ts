export interface ModelConfig {
  baseURL: string
  apiKey: string
  chatModel: string
  imageModel: string
}

export type ArticleLength = 'short' | 'long'

export interface NewsInput {
  title: string
  outline: string
  verbatim: string[]
  length: ArticleLength
}

export interface ArticleSection {
  heading: string
  html: string
}

export interface GeneratedArticle {
  title: string
  summary: string
  category: string
  tags: string[]
  date: string
  sections: ArticleSection[]
}

/** 待确认的覆盖式生成请求（已有稿件时先弹确认框，见 ADR-0003） */
export interface PendingGeneration {
  input: NewsInput
  extraInstruction?: string
}

export type CoverSource = 'upload' | 'ai' | null

export type ToastKind = 'success' | 'error' | 'info'

export interface ToastMsg {
  id: number
  kind: ToastKind
  text: string
}

export type ApiErrorKind = 'cors' | 'auth' | 'ratelimit' | 'server' | 'network' | 'bad_response' | 'aborted'
