import React from "react"

import { cn } from "../../utils/cn"

export interface OrbitingCirclesProps
    extends React.HTMLAttributes<HTMLDivElement> {
    className?: string
    children?: React.ReactNode
    reverse?: boolean
    duration?: number
    delay?: number
    radius?: number
    path?: boolean
    iconSize?: number
    speed?: number
    initialAngle?: number
}

export function OrbitingCircles({
    className,
    children,
    reverse,
    duration = 20,
    radius = 160,
    path = true,
    iconSize = 30,
    speed = 1,
    initialAngle = 0,
    ...props
}: OrbitingCirclesProps) {
    const calculatedDuration = duration / speed
    const childrenArray = React.Children.toArray(children)
    const childrenCount = childrenArray.length

    return (
        <div className={cn("relative w-full h-full", className)} {...props}>
            {path && (
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    version="1.1"
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                    width={(radius * 2) + (iconSize * 2)}
                    height={(radius * 2) + (iconSize * 2)}
                    style={{ zIndex: 1 }}
                >
                    <circle
                        cx="50%"
                        cy="50%"
                        r={radius}
                        fill="none"
                        stroke="rgba(156, 163, 175, 0.3)"
                        strokeWidth="1.5"
                        strokeDasharray="5,5"
                    />
                </svg>
            )}
            {childrenArray.map((child, index) => {
                const angle = (360 / childrenCount) * index + initialAngle
                return (
                    <div
                        key={index}
                        style={
                            {
                                "--duration": `${calculatedDuration}s`,
                                "--radius": `${radius}px`,
                                "--angle": angle,
                                "--icon-size": `${iconSize}px`,
                                zIndex: 10,
                            } as React.CSSProperties
                        }
                        className={cn(
                            `flex absolute justify-center items-center animate-orbit`,
                            { "[animation-direction:reverse]": reverse },
                        )}
                    >
                        <div style={{ width: `${iconSize}px`, height: `${iconSize}px` }}>
                            {child}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}