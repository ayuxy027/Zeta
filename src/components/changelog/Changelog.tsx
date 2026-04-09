import React from 'react';
import { formatDate } from '../changelog/lib/utils';
import { Highlighter } from '../effects/Highlighter';

interface ChangelogContent {
  description?: string;
  features?: string[];
  bugFixes?: string[];
  improvements?: string[];
  listItems?: string[];
}

interface ChangelogEntry {
  id: string;
  title: string;
  date: string;
  version?: string;
  tags?: string[];
  content?: ChangelogContent; // Structured content object
  // Legacy fields for backward compatibility
  features?: string[];
  bugFixes?: string[];
}

interface ChangelogProps {
  entries: ChangelogEntry[];
}

const Changelog: React.FC<ChangelogProps> = ({ entries }) => {
  return (
    <div className="min-h-screen bg-[--background] relative">
      {/* Header */}
      <div className="border-b border-[--border]">
        <div className="max-w-5xl mx-auto relative">
          <div className="p-3 flex items-center justify-between">
            <h1 className="text-3xl font-semibold tracking-tight">
              <Highlighter
                action="underline"
                color="#6b7280"
                strokeWidth={3}
                padding={4}
                animationDuration={1000}
                isView={true}
                delay={100}
              >
                Changelog
              </Highlighter>
            </h1>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="max-w-5xl mx-auto px-6 lg:px-10 pt-10">
        <div className="relative">
          {entries.map((entry) => {
            const date = new Date(entry.date);
            const formattedDate = formatDate(date);

            return (
              <div key={entry.id} className="relative">
                <div className="flex flex-col md:flex-row gap-y-6">
                  <div className="md:w-48 flex-shrink-0">
                    <div className="md:sticky md:top-8 pb-10">
                      <time className="text-sm font-medium text-[--muted-foreground] block mb-3">
                        {formattedDate}
                      </time>

                      {entry.version && (
                        <div className="inline-flex relative z-10 items-center justify-center w-10 h-10 text-[--foreground] border border-[--border] rounded-lg text-sm font-bold">
                          {entry.version}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right side - Content */}
                  <div className="flex-1 md:pl-8 relative pb-10">
                    {/* Vertical timeline line */}
                    <div className="hidden md:block absolute top-8 left-0 w-px h-full bg-[--border]">
                      {/* Timeline dot */}
                      <div className="hidden md:block absolute -translate-x-1/2 size-3 bg-[--primary] rounded-full z-10 border-2 border-white" />
                    </div>

                    <div className="space-y-6">
                      <div className="relative z-10 flex flex-col gap-2">
                        <h2 className="text-2xl font-semibold tracking-tight text-balance">
                          <Highlighter
                            action="underline"
                            color="#6b7280"
                            strokeWidth={2.5}
                            animationDuration={1000}
                            padding={4}
                            isView={true}
                            delay={200}
                          >
                            {entry.title}
                          </Highlighter>
                        </h2>

                        {/* Tags */}
                        {entry.tags && entry.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {entry.tags.map((tag: string, tagIndex: number) => (
                              <span
                                key={tagIndex}
                                className="h-6 w-fit px-2 text-xs font-medium bg-[--muted] text-[--muted-foreground] rounded-full border border-[--border] flex items-center justify-center"
                              >
                                <Highlighter
                                  action="highlight"
                                  color="#e5e7eb"
                                  strokeWidth={2}
                                  padding={3}
                                  animationDuration={800}
                                  isView={true}
                                  delay={300 + (100 * tagIndex)}
                                >
                                  {tag}
                                </Highlighter>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      {/* Content for changelog entry - structured content or simple lists */}
                      <div className="changelog-content max-w-none space-y-4">
                        {entry.content ? (
                          <>
                            {entry.content.description && (
                              <p>{entry.content.description}</p>
                            )}
                            
                            {entry.content.listItems && entry.content.listItems.length > 0 && (
                              <ul className="list-disc pl-5 space-y-1">
                                {entry.content.listItems.map((item, idx) => (
                                  <li key={idx}>{item}</li>
                                ))}
                              </ul>
                            )}
                            
                            {entry.content.features && entry.content.features.length > 0 && (
                              <div>
                                <h3 className="font-semibold mt-4">
                                  <Highlighter
                                    action="underline"
                                    color="#34d399"
                                    strokeWidth={3}
                                    padding={4}
                                    animationDuration={800}
                                    isView={true}
                                    delay={400}
                                  >
                                    Features
                                  </Highlighter>
                                </h3>
                                <ul className="list-disc pl-5 space-y-1 mt-1">
                                  {entry.content.features.map((feature, idx) => (
                                    <li key={idx}>
                                      <Highlighter
                                        action="highlight"
                                        color="#d1fae5"
                                        strokeWidth={2}
                                        padding={3}
                                        animationDuration={600}
                                        isView={true}
                                        delay={500 + (100 * idx)}
                                      >
                                        {feature}
                                      </Highlighter>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {entry.content.bugFixes && entry.content.bugFixes.length > 0 && (
                              <div>
                                <h3 className="font-semibold mt-4">
                                  <Highlighter
                                    action="underline"
                                    color="#ef4444"
                                    strokeWidth={3}
                                    padding={4}
                                    animationDuration={800}
                                    isView={true}
                                    delay={400}
                                  >
                                    Bug Fixes
                                  </Highlighter>
                                </h3>
                                <ul className="list-disc pl-5 space-y-1 mt-1">
                                  {entry.content.bugFixes.map((bug, idx) => (
                                    <li key={idx}>
                                      <Highlighter
                                        action="highlight"
                                        color="#fee2e2"
                                        strokeWidth={2}
                                        padding={3}
                                        animationDuration={600}
                                        isView={true}
                                        delay={500 + (100 * idx)}
                                      >
                                        {bug}
                                      </Highlighter>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {entry.content.improvements && entry.content.improvements.length > 0 && (
                              <div>
                                <h3 className="font-semibold mt-4">
                                  <Highlighter
                                    action="underline"
                                    color="#f59e0b"
                                    strokeWidth={3}
                                    padding={4}
                                    animationDuration={800}
                                    isView={true}
                                    delay={400}
                                  >
                                    Improvements
                                  </Highlighter>
                                </h3>
                                <ul className="list-disc pl-5 space-y-1 mt-1">
                                  {entry.content.improvements.map((improvement, idx) => (
                                    <li key={idx}>
                                      <Highlighter
                                        action="highlight"
                                        color="#fef3c7"
                                        strokeWidth={2}
                                        padding={3}
                                        animationDuration={600}
                                        isView={true}
                                        delay={500 + (100 * idx)}
                                      >
                                        {improvement}
                                      </Highlighter>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            {/* Simple lists for backward compatibility */}
                            {entry.features && entry.features.length > 0 && (
                              <div>
                                <h3 className="font-semibold mt-4">
                                  <Highlighter
                                    action="underline"
                                    color="#34d399"
                                    strokeWidth={3}
                                    padding={4}
                                    animationDuration={800}
                                    isView={true}
                                    delay={400}
                                  >
                                    Features
                                  </Highlighter>
                                </h3>
                                <ul className="list-disc pl-5 space-y-1 mt-1">
                                  {entry.features.map((feature, idx) => (
                                    <li key={idx}>
                                      <Highlighter
                                        action="highlight"
                                        color="#d1fae5"
                                        strokeWidth={2}
                                        padding={3}
                                        animationDuration={600}
                                        isView={true}
                                        delay={500 + (100 * idx)}
                                      >
                                        {feature}
                                      </Highlighter>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {entry.bugFixes && entry.bugFixes.length > 0 && (
                              <div>
                                <h3 className="font-semibold mt-4">
                                  <Highlighter
                                    action="underline"
                                    color="#ef4444"
                                    strokeWidth={3}
                                    padding={4}
                                    animationDuration={800}
                                    isView={true}
                                    delay={400}
                                  >
                                    Bug Fixes
                                  </Highlighter>
                                </h3>
                                <ul className="list-disc pl-5 space-y-1 mt-1">
                                  {entry.bugFixes.map((bug, idx) => (
                                    <li key={idx}>
                                      <Highlighter
                                        action="highlight"
                                        color="#fee2e2"
                                        strokeWidth={2}
                                        padding={3}
                                        animationDuration={600}
                                        isView={true}
                                        delay={500 + (100 * idx)}
                                      >
                                        {bug}
                                      </Highlighter>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default Changelog;