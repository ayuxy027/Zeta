import React from 'react';
import Changelog from '../components/changelog/Changelog';

const ChangelogPage: React.FC = () => {
  const changelogEntries = [
    {
      id: "1",
      title: "Enhanced AI Agent Interface and Reasoning Capabilities",
      date: "2025-06-15",
      version: "1.2",
      tags: ["AI", "Performance", "Interface", "Reasoning"],
      content: {
        description: "Major improvements to AI agent performance, conversation interface, and reasoning abilities.",
        listItems: [
          "Enhanced Reasoning: Improved logical thinking and problem-solving",
          "Context Awareness: Better understanding of conversation history", 
          "Multi-modal Support: Process text, images, and code simultaneously",
          "Adaptive Responses: Tailored communication style based on user preferences",
          "Real-time Learning: Dynamic adaptation during conversations"
        ],
        features: [
          "60% faster response generation",
          "Optimized model inference with reduced latency",
          "Improved memory management for long conversations",
          "Enhanced token efficiency and cost optimization",
          "Better handling of complex multi-step tasks"
        ],
        bugFixes: [
          "Fixed conversation context loss in long sessions",
          "Resolved inconsistent response formatting",
          "Corrected memory retention issues",
          "Fixed edge cases in code generation",
          "Improved error handling and recovery"
        ]
      }
    },
    {
      id: "2",
      title: "Release 2.1 - Kimi K2 Support",
      date: "2025-06-30",
      version: "2.1",
      tags: ["AI", "Performance", "Reasoning", "Multi-modal"],
      content: {
        description: "Major improvements to AI agent reasoning, conversation handling, and multi-modal processing",
        listItems: [
          "Advanced reasoning engine with improved logical thinking",
          "Multi-modal processing for text, images, and code analysis",
          "Context-aware responses with better conversation memory",
          "Adaptive communication that matches user preferences"
        ]
      }
    },
    {
      id: "3", 
      title: "UX Improvements",
      date: "2025-05-23",
      version: "0.9",
      tags: ["UI", "UX"],
      content: {
        description: "Major improvements to UI/UX",
        listItems: [
          "Redesigned interface with cleaner, more intuitive navigation",
          "Enhanced accessibility with improved keyboard navigation and screen reader support",
          "Streamlined workflows for faster task completion",
          "Responsive design optimized for all device sizes"
        ]
      }
    }
  ];

  return (
    <Changelog entries={changelogEntries} />
  );
};

export default ChangelogPage;