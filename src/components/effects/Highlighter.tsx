import { useEffect, useRef } from "react"
import type React from "react"
import { useInView } from "framer-motion"
import { annotate } from "rough-notation"
import type { RoughAnnotation } from "rough-notation/lib/model"

type AnnotationAction =
    | "highlight"
    | "underline"
    | "box"
    | "circle"
    | "strike-through"
    | "crossed-off"
    | "bracket"

interface HighlighterProps {
    children: React.ReactNode
    action?: AnnotationAction
    color?: string
    strokeWidth?: number
    animationDuration?: number
    iterations?: number
    padding?: number
    multiline?: boolean
    isView?: boolean
    delay?: number
}

export function Highlighter({
    children,
    action = "highlight",
    color = "#ffd1dc",
    strokeWidth = 1.5,
    animationDuration = 600,
    iterations = 2,
    padding = 2,
    multiline = true,
    isView = false,
    delay = 0,
}: HighlighterProps) {
    const elementRef = useRef<HTMLSpanElement>(null)
    const annotationRef = useRef<RoughAnnotation | null>(null)

    const isInView = useInView(elementRef, {
        once: true,
        margin: "-10%",
    })

    // If isView is false, always show. If isView is true, wait for inView
    const shouldShow = !isView || isInView

    useEffect(() => {
        if (!shouldShow) return

        const element = elementRef.current
        if (!element) return

        let timeoutId: number | null = null
        let resizeObserver: ResizeObserver | null = null

        const showAnnotation = () => {
            const annotationConfig = {
                type: action,
                color,
                strokeWidth,
                animationDuration,
                iterations,
                padding,
                multiline,
            }

            const annotation = annotate(element, annotationConfig)

            annotationRef.current = annotation
            annotationRef.current.show()

            resizeObserver = new ResizeObserver(() => {
                if (annotationRef.current) {
                    annotationRef.current.hide()
                    annotationRef.current.show()
                }
            })

            resizeObserver.observe(element)
            resizeObserver.observe(document.body)
        }

        if (delay > 0) {
            timeoutId = setTimeout(showAnnotation, delay) as unknown as number
        } else {
            showAnnotation()
        }

        return () => {
            if (timeoutId) {
                clearTimeout(timeoutId)
            }
            if (resizeObserver) {
                resizeObserver.disconnect()
            }
            if (annotationRef.current) {
                annotationRef.current.remove()
                annotationRef.current = null
            }
        }
    }, [
        shouldShow,
        action,
        color,
        strokeWidth,
        animationDuration,
        iterations,
        padding,
        multiline,
        delay,
    ])

    return (
        <span ref={elementRef} className="inline-block relative bg-transparent">
            {children}
        </span>
    )
}