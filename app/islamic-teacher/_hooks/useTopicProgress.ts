'use client'
// ─── useTopicProgress ─────────────────────────────────────────────────────
// Handles per-learner topic tracking with optimistic UI.
// Ticks update instantly. DB writes are batched in background.

import { useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase'

interface SaveItem {
  learnerId: string
  topicId: string
  completed: boolean
}

export function useTopicProgress(teacherId: string) {
  const supabase   = createClient()
  const [progress, setProgress]     = useState<Record<string, Record<string, boolean>>>({})
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const queueRef  = useRef<SaveItem[]>([])
  const savingRef = useRef(false)

  // Load progress for a subject
  async function load(learnerIds: string[], topicIds: string[]) {
    if (!learnerIds.length || !topicIds.length) { setProgress({}); return }
    const { data } = await createClient()
      .from('learner_topic_progress')
      .select('learner_id, topic_id, completed')
      .in('learner_id', learnerIds)
      .in('topic_id', topicIds)

    const map: Record<string, Record<string, boolean>> = {}
    ;(data || []).forEach((p: any) => {
      if (!map[p.learner_id]) map[p.learner_id] = {}
      map[p.learner_id][p.topic_id] = p.completed
    })
    setProgress(map)
  }

  // Optimistic toggle — UI updates instantly
  const toggle = useCallback((learnerId: string, topicId: string) => {
    const newVal = !progress[learnerId]?.[topicId]
    setProgress(prev => ({
      ...prev,
      [learnerId]: { ...prev[learnerId], [topicId]: newVal },
    }))
    queueRef.current.push({ learnerId, topicId, completed: newVal })
    if (!savingRef.current) drainQueue()
  }, [progress])

  async function drainQueue() {
    if (savingRef.current || queueRef.current.length === 0) return
    savingRef.current = true
    setSyncStatus('saving')
    const today = new Date().toISOString().split('T')[0]
    try {
      while (queueRef.current.length > 0) {
        // Take up to 10 at once, run in parallel
        const batch = queueRef.current.splice(0, 10)
        await Promise.all(batch.map(({ learnerId, topicId, completed }) =>
          supabase.from('learner_topic_progress').upsert({
            learner_id: learnerId, topic_id: topicId,
            completed, completed_date: completed ? today : null,
            marked_by: teacherId,
          }, { onConflict: 'learner_id,topic_id' })
        ))
      }
      setSyncStatus('saved')
      setTimeout(() => setSyncStatus('idle'), 2000)
    } catch {
      setSyncStatus('error')
    } finally {
      savingRef.current = false
    }
  }

  function reset() {
    setProgress({})
    queueRef.current = []
    setSyncStatus('idle')
  }

  // Completion stats helpers
  function completedCount(learnerId: string, topicIds: string[]) {
    return topicIds.filter(t => progress[learnerId]?.[t]).length
  }

  function overallPct(learnerIds: string[], topicIds: string[]) {
    if (!learnerIds.length || !topicIds.length) return 0
    const total = learnerIds.length * topicIds.length
    const done  = learnerIds.reduce((sum, lId) =>
      sum + topicIds.filter(t => progress[lId]?.[t]).length, 0
    )
    return Math.round((done / total) * 100)
  }

  return { progress, syncStatus, load, toggle, reset, completedCount, overallPct }
}
