import React, { useState, useEffect, useRef } from 'react';
import { FileText, Target, CheckSquare, Shield, Zap, Users, X, Loader2, ArrowRight, ChevronRight, BarChart3, Settings, Search, MoreHorizontal, Copy, UserPlus, ChevronDown, Star, Tag, ThumbsUp, Sparkles, Bookmark, Heart } from 'lucide-react';

const TranscriptionBlock: React.FC = () => {
    const [showModal, setShowModal] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [selectedAction, setSelectedAction] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'transcript' | 'actions' | 'insights'>('transcript');
    const [searchQuery, setSearchQuery] = useState('');
    const [assignments, setAssignments] = useState<Record<string, string>>({
        'stories': 'James Chen',
        'prd': 'James Chen',
        'sprint': 'James Chen'
    });
    const [statuses, setStatuses] = useState<Record<string, 'todo' | 'in-progress' | 'done'>>({
        'stories': 'in-progress',
        'prd': 'todo',
        'sprint': 'todo'
    });
    const [tags, setTags] = useState<Record<string, string[]>>({
        'stories': ['urgent', 'login'],
        'prd': ['design'],
        'sprint': ['planning']
    });
    const [reactions, setReactions] = useState<Record<number, string[]>>({});
    const [bookmarkedLines, setBookmarkedLines] = useState<Set<number>>(new Set());
    const [showReactionsForLine, setShowReactionsForLine] = useState<number | null>(null);
    const [openAssignDropdown, setOpenAssignDropdown] = useState<string | null>(null);
    const [openTagInput, setOpenTagInput] = useState<string | null>(null);
    const [tagInputValue, setTagInputValue] = useState('');
    const autoDemoRef = useRef<{ isRunning: boolean; timeoutId?: NodeJS.Timeout | undefined }>({ isRunning: false });
    const assignDropdownRefs = useRef<Record<string, HTMLDivElement | null>>({});

    const handleExport = () => {
        setIsExporting(true);
        setTimeout(() => {
            setIsExporting(false);
            setShowModal(true);
        }, 1500);
    };

    // Mock data for enhanced functionality
    const participants = [
        { name: "James Chen", role: "Product Manager", active: true, avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=400&fit=crop&q=80&facepad=2" },
        { name: "Marcus Johnson", role: "Lead Engineer", active: false, avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&q=80&facepad=2" },
        { name: "Alex Patel", role: "UX Designer", active: true, avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop&q=80&facepad=2" },
        { name: "David Rodriguez", role: "VP Product", active: true, avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&q=80&facepad=2" }
    ];

    const transcript = [
        { time: "14:28", speaker: "James", color: "text-gray-900", text: "We need to prioritize the login flow redesign. Users are dropping off at 40% rate." },
        { time: "14:29", speaker: "Marcus", color: "text-gray-700", text: "Can we break that into three stories? Social auth, password reset, and magic link?" },
        { time: "14:31", speaker: "Alex", color: "text-gray-700", text: "I have mockups ready. Can share after this call. Social auth should be first—users keep requesting it." },
        { time: "14:32", speaker: "David", color: "text-gray-900", text: "Agreed. Let's scope it to 2-week sprint. James, can you create the stories by EOD?" },
        { time: "14:35", speaker: "Marcus", color: "text-gray-700", text: "Also consider mobile responsiveness. We've had feedback on the mobile experience." },
        { time: "14:36", speaker: "James", color: "text-gray-900", text: "Good point. I'll add that to the epic description." }
    ];

    const actionItems = [
        { id: 'stories', title: 'Create User Stories', desc: '3 stories for login flow epic', due: 'EOD' },
        { id: 'prd', title: 'Draft PRD', desc: 'Login Flow Redesign v2', due: 'Tomorrow' },
        { id: 'sprint', title: 'Propose Sprint Goal', desc: 'Reduce drop-off from 40% → 15%', due: 'This Week' }
    ];

    const availableTags = ['urgent', 'login', 'design', 'planning', 'backend', 'frontend', 'api', 'mobile'];

    // Reaction icons configuration
    const reactionIcons = [
        { id: 'thumbs-up', icon: ThumbsUp, label: 'Like' },
        { id: 'heart', icon: Heart, label: 'Love' },
        { id: 'rocket', icon: Zap, label: 'Awesome' },
        { id: 'lightbulb', icon: Sparkles, label: 'Idea' },
        { id: 'target', icon: Target, label: 'On Point' },
        { id: 'star', icon: Star, label: 'Star' }
    ];

    // Handle assignment
    const handleAssign = (actionId: string, participantName: string) => {
        setAssignments(prev => ({ ...prev, [actionId]: participantName }));
        setOpenAssignDropdown(null);
    };


    // Handle status change
    const handleStatusChange = (actionId: string, status: 'todo' | 'in-progress' | 'done') => {
        setStatuses(prev => ({ ...prev, [actionId]: status }));
    };

    // Handle tag addition
    const handleAddTag = (actionId: string, tag: string) => {
        if (tag.trim() && !tags[actionId]?.includes(tag.trim())) {
            setTags(prev => ({
                ...prev,
                [actionId]: [...(prev[actionId] || []), tag.trim()]
            }));
        }
        setTagInputValue('');
        setOpenTagInput(null);
    };

    // Handle tag removal
    const handleRemoveTag = (actionId: string, tagToRemove: string) => {
        setTags(prev => ({
            ...prev,
            [actionId]: (prev[actionId] || []).filter(tag => tag !== tagToRemove)
        }));
    };

    // Handle reaction
    const handleReaction = (lineIndex: number, reactionId: string) => {
        setReactions(prev => {
            const currentReactions = prev[lineIndex] || [];
            if (currentReactions.includes(reactionId)) {
                return { ...prev, [lineIndex]: currentReactions.filter((id: string) => id !== reactionId) };
            }
            return { ...prev, [lineIndex]: [...currentReactions, reactionId] };
        });
    };

    // Handle bookmark
    const handleBookmark = (lineIndex: number) => {
        setBookmarkedLines(prev => {
            const newSet = new Set(prev);
            if (newSet.has(lineIndex)) {
                newSet.delete(lineIndex);
            } else {
                newSet.add(lineIndex);
            }
            return newSet;
        });
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (!openAssignDropdown) return;

            const dropdownElement = assignDropdownRefs.current[openAssignDropdown];
            if (dropdownElement && !dropdownElement.contains(event.target as Node)) {
                setOpenAssignDropdown(null);
            }
        };

        if (openAssignDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [openAssignDropdown]);

    // Enhanced data for insights
    const insights = [
        { metric: 'Engagement', value: '72%', trend: 'up' },
        { metric: 'Action Items', value: '4', trend: 'new' },
        { metric: 'Key Topic', value: 'Login Flow', trend: 'hot' },
        { metric: 'Meeting Duration', value: '42 min', trend: 'optimal' }
    ];

    // Auto-demo: Random, ambient interactions - stops on user interaction
    useEffect(() => {
        const autoDemoState = autoDemoRef.current;
        // Initialize state
        autoDemoState.isRunning = true;
        let timeoutId: NodeJS.Timeout | null = null;

        // Action definitions with metadata
        interface ActionDef {
            execute: () => void;
            delay: number; // Delay after this action
        }

        const actions: ActionDef[] = [
            // Tab switches
            { execute: () => setActiveTab('transcript'), delay: 1500 + Math.random() * 2000 },
            { execute: () => setActiveTab('actions'), delay: 1500 + Math.random() * 2000 },
            { execute: () => setActiveTab('insights'), delay: 1500 + Math.random() * 2000 },

            // Participants
            { execute: () => setSelectedAction('participant-0'), delay: 1200 + Math.random() * 1500 },
            { execute: () => setSelectedAction('participant-1'), delay: 1200 + Math.random() * 1500 },
            { execute: () => setSelectedAction('participant-2'), delay: 1200 + Math.random() * 1500 },
            { execute: () => setSelectedAction('participant-3'), delay: 1200 + Math.random() * 1500 },

            // Transcript lines
            { execute: () => setSelectedAction('line-0'), delay: 1200 + Math.random() * 1500 },
            { execute: () => setSelectedAction('line-1'), delay: 1200 + Math.random() * 1500 },
            { execute: () => setSelectedAction('line-2'), delay: 1200 + Math.random() * 1500 },
            { execute: () => setSelectedAction('line-3'), delay: 1200 + Math.random() * 1500 },
            { execute: () => setSelectedAction('line-4'), delay: 1200 + Math.random() * 1500 },
            { execute: () => setSelectedAction('line-5'), delay: 1200 + Math.random() * 1500 },

            // Action items
            { execute: () => setSelectedAction('action-stories'), delay: 1200 + Math.random() * 1500 },
            { execute: () => setSelectedAction('action-prd'), delay: 1200 + Math.random() * 1500 },
            { execute: () => setSelectedAction('action-sprint'), delay: 1200 + Math.random() * 1500 },

            // Assign actions to participants (micro-interactions)
            { execute: () => handleAssign('stories', 'Marcus Johnson'), delay: 1500 + Math.random() * 1500 },
            { execute: () => handleAssign('prd', 'Alex Patel'), delay: 1500 + Math.random() * 1500 },
            { execute: () => handleAssign('sprint', 'David Rodriguez'), delay: 1500 + Math.random() * 1500 },
            { execute: () => handleAssign('stories', 'James Chen'), delay: 1500 + Math.random() * 1500 },

            // Sidebar actions
            { execute: () => setSelectedAction('stories'), delay: 1500 + Math.random() * 2000 },
            { execute: () => setSelectedAction('prd'), delay: 1500 + Math.random() * 2000 },
            { execute: () => setSelectedAction('sprint'), delay: 1500 + Math.random() * 2000 },

            // Insights
            { execute: () => setSelectedAction('insight-0'), delay: 1200 + Math.random() * 1500 },
            { execute: () => setSelectedAction('insight-1'), delay: 1200 + Math.random() * 1500 },
            { execute: () => setSelectedAction('insight-2'), delay: 1200 + Math.random() * 1500 },
            { execute: () => setSelectedAction('insight-3'), delay: 1200 + Math.random() * 1500 },

            // Search typing - type "james" sequentially
            { execute: () => setSearchQuery(''), delay: 150 },
            { execute: () => setSearchQuery('j'), delay: 120 },
            { execute: () => setSearchQuery('ja'), delay: 120 },
            { execute: () => setSearchQuery('jam'), delay: 120 },
            { execute: () => setSearchQuery('jame'), delay: 120 },
            { execute: () => setSearchQuery('james'), delay: 1200 + Math.random() * 1500 }, // Continue sequentially

            // Clear selections
            { execute: () => setSelectedAction(null), delay: 1500 + Math.random() * 2000 },
            { execute: () => setSearchQuery(''), delay: 1500 + Math.random() * 2000 },
        ];

        const executeRandomAction = (): void => {
            // Early return if not running
            if (!autoDemoState.isRunning) {
                return;
            }

            // Select random action
            const randomIndex = Math.floor(Math.random() * actions.length);
            const selectedAction = actions[randomIndex];

            if (!selectedAction) {
                return;
            }

            // Execute the action
            selectedAction.execute();

            // Schedule next action with the action's specific delay
            timeoutId = setTimeout(() => {
                executeRandomAction();
            }, selectedAction.delay);

            // Update ref with current timeout for cleanup
            autoDemoState.timeoutId = timeoutId;
        };

        // Stop auto-demo function
        const stopAutoDemo = (): void => {
            autoDemoState.isRunning = false;

            // Clear any pending timeout
            if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutId = null;
            }

            if (autoDemoState.timeoutId) {
                clearTimeout(autoDemoState.timeoutId);
                delete autoDemoState.timeoutId;
            }
        };

        // Attach event listeners to container
        const container = document.querySelector('[data-transcription-block]');
        const eventOptions = { passive: true, once: true };

        if (container) {
            container.addEventListener('click', stopAutoDemo, eventOptions);
            container.addEventListener('keydown', stopAutoDemo, eventOptions);
            container.addEventListener('mousemove', stopAutoDemo, eventOptions);
        }

        // Start auto-demo after initial delay
        timeoutId = setTimeout(() => {
            if (autoDemoState.isRunning) {
                executeRandomAction();
            }
        }, 2500);

        autoDemoState.timeoutId = timeoutId;

        // Cleanup function
        return (): void => {
            // Stop execution
            autoDemoState.isRunning = false;

            // Clear timeouts
            if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutId = null;
            }

            if (autoDemoState.timeoutId) {
                clearTimeout(autoDemoState.timeoutId);
                delete autoDemoState.timeoutId;
            }

            // Remove event listeners
            if (container) {
                container.removeEventListener('click', stopAutoDemo);
                container.removeEventListener('keydown', stopAutoDemo);
                container.removeEventListener('mousemove', stopAutoDemo);
            }
        };
    }, []); // Empty deps - only run once on mount

    return (
        <section className="pt-0 pb-24 bg-gradient-to-b from-white via-gray-50/30 to-white">
            <div className="mx-auto w-[80vw] max-w-7xl">
                <div data-transcription-block className="overflow-hidden relative bg-white rounded-2xl border border-gray-200 shadow-2xl">
                    {/* Header with macOS-style buttons */}
                    <div className="flex justify-between items-center px-6 py-4 bg-gray-50 border-b border-gray-200">
                        <div className="flex gap-2">
                            <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                            <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                            <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                        </div>
                        <div></div>
                    </div>

                    {/* Navigation tabs for the mini-website */}
                    <div className="px-6 py-2 bg-gray-50 border-b border-gray-200">
                        <div className="flex space-x-1">
                            {([
                                { id: 'transcript' as const, label: 'Transcript', icon: FileText },
                                { id: 'actions' as const, label: 'Actions', icon: CheckSquare },
                                { id: 'insights' as const, label: 'Insights', icon: BarChart3 }
                            ] as const).map((tab) => {
                                const Icon = tab.icon;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => {
                                            // Stop auto-demo on user interaction
                                            autoDemoRef.current.isRunning = false;
                                            if (autoDemoRef.current.timeoutId) {
                                                clearTimeout(autoDemoRef.current.timeoutId);
                                                autoDemoRef.current.timeoutId = undefined;
                                            }
                                            setActiveTab(tab.id);
                                        }}
                                        className={`flex items-center space-x-1 px-4 py-2 rounded-lg transition-all duration-500 ${activeTab === tab.id
                                            ? 'bg-gray-200 text-gray-800 font-medium shadow-sm'
                                            : 'text-gray-500 hover:bg-gray-100'
                                            }`}
                                    >
                                        <Icon className="w-4 h-4" />
                                        <span>{tab.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 h-[600px]">
                        {/* Sidebar - Participants with enhanced interactions */}
                        <div className="p-6 bg-gray-50 border-r border-gray-200 lg:col-span-3">
                            <div className="mb-6 text-xs font-semibold tracking-wide text-gray-500 uppercase">PARTICIPANTS</div>
                            <div className="space-y-3">
                                {participants.map((p, i) => (
                                    <div
                                        key={i}
                                        className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-500 cursor-pointer ${selectedAction === `participant-${i}`
                                            ? 'bg-gray-100 border border-gray-300 shadow-sm'
                                            : 'hover:bg-gray-50 border border-transparent'
                                            }`}
                                        onClick={() => {
                                            // Stop auto-demo on user interaction
                                            autoDemoRef.current.isRunning = false;
                                            if (autoDemoRef.current.timeoutId) {
                                                clearTimeout(autoDemoRef.current.timeoutId);
                                                autoDemoRef.current.timeoutId = undefined;
                                            }
                                            setSelectedAction(`participant-${i}`);
                                        }}
                                    >
                                        <div className="overflow-hidden relative flex-shrink-0 w-10 h-10 rounded-full">
                                            <img src={p.avatar} alt={p.name} className="object-cover w-full h-full grayscale transition-all hover:grayscale-0" />
                                            {p.active && (
                                                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium text-gray-900 truncate">{p.name}</div>
                                            <div className="text-xs text-gray-500 truncate">{p.role}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Additional controls */}
                            <div className="mt-6 pt-4 border-t border-gray-200">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs font-medium text-gray-700">MEETING TOOLS</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <button className="p-2 text-xs bg-white border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center space-x-1">
                                        <Copy className="w-3 h-3" />
                                        <span>Copy</span>
                                    </button>
                                    <button className="p-2 text-xs bg-white border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center space-x-1">
                                        <Settings className="w-3 h-3" />
                                        <span>Settings</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Main content area with dynamic tabs */}
                        <div className="overflow-y-auto p-6 bg-white lg:col-span-6 transition-colors duration-300">
                            {activeTab === 'transcript' && (
                                <>
                                    <div className="flex justify-between items-center mb-6">
                                        <div className="flex items-center space-x-3">
                                            <FileText className="w-5 h-5 text-gray-600" />
                                            <span className="text-sm font-semibold tracking-wide text-gray-900 uppercase">TRANSCRIPT</span>
                                            <span className="text-xs text-gray-500">Real-time</span>
                                        </div>

                                        {/* Search functionality */}
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                            <input
                                                type="text"
                                                placeholder="Search transcript..."
                                                value={searchQuery}
                                                onChange={(e) => {
                                                    // Stop auto-demo on user interaction
                                                    autoDemoRef.current.isRunning = false;
                                                    if (autoDemoRef.current.timeoutId) {
                                                        clearTimeout(autoDemoRef.current.timeoutId);
                                                        autoDemoRef.current.timeoutId = undefined;
                                                    }
                                                    setSearchQuery(e.target.value);
                                                }}
                                                className={`pl-10 pr-4 py-1.5 text-sm border rounded-lg focus:outline-none transition-all duration-500 ${searchQuery ? 'bg-gray-50 border-gray-300' : 'bg-gray-50 border-gray-200 hover:bg-gray-100/50 focus:border-gray-300'
                                                    }`}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        {transcript
                                            .filter(line =>
                                                searchQuery === '' ||
                                                line.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                line.speaker.toLowerCase().includes(searchQuery.toLowerCase())
                                            )
                                            .map((line, i) => {
                                                const lineReactions = reactions[i] || [];
                                                const isBookmarked = bookmarkedLines.has(i);
                                                const showReactions = showReactionsForLine === i;

                                                return (
                                                    <div
                                                        key={i}
                                                        className={`group flex gap-4 p-3 rounded-lg border-l transition-all duration-500 ${selectedAction === `line-${i}`
                                                            ? 'bg-gray-50 border-l-gray-400 shadow-sm'
                                                            : 'border-transparent hover:bg-gray-50/50 hover:border-l-gray-200'
                                                            }`}
                                                        onClick={(e) => {
                                                            if ((e.target as HTMLElement).closest('[data-interaction-button]')) {
                                                                return;
                                                            }
                                                            // Stop auto-demo on user interaction
                                                            autoDemoRef.current.isRunning = false;
                                                            if (autoDemoRef.current.timeoutId) {
                                                                clearTimeout(autoDemoRef.current.timeoutId);
                                                                autoDemoRef.current.timeoutId = undefined;
                                                            }
                                                            setSelectedAction(`line-${i}`);
                                                        }}
                                                    >
                                                        <span className="flex-shrink-0 w-12 text-xs font-medium text-gray-400 transition-colors duration-200">{line.time}</span>
                                                        <div className="flex-1 min-w-0 relative">
                                                            <div className="flex items-start gap-2 mb-1">
                                                                <span className={`font-semibold text-sm ${line.color} transition-colors duration-200`}>{line.speaker}:</span>
                                                                <button
                                                                    data-interaction-button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        autoDemoRef.current.isRunning = false;
                                                                        if (autoDemoRef.current.timeoutId) {
                                                                            clearTimeout(autoDemoRef.current.timeoutId);
                                                                            autoDemoRef.current.timeoutId = undefined;
                                                                        }
                                                                        handleBookmark(i);
                                                                    }}
                                                                    className={`flex-shrink-0 transition-all duration-200 ${isBookmarked ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-400'}`}
                                                                >
                                                                    <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-current' : ''}`} />
                                                                </button>
                                                            </div>
                                                            <span className="text-sm text-gray-700 transition-colors duration-200">{line.text}</span>

                                                            {/* Reactions */}
                                                            {lineReactions.length > 0 && (
                                                                <div className="flex items-center gap-1.5 mt-2">
                                                                    {lineReactions.map((reactionId) => {
                                                                        const reaction = reactionIcons.find(r => r.id === reactionId);
                                                                        if (!reaction) return null;
                                                                        const IconComponent = reaction.icon;
                                                                        return (
                                                                            <button
                                                                                key={reactionId}
                                                                                data-interaction-button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    handleReaction(i, reactionId);
                                                                                }}
                                                                                className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded-full text-xs hover:bg-gray-200 transition-all duration-200 hover:scale-105 group"
                                                                                title={reaction.label}
                                                                            >
                                                                                <IconComponent className="w-3 h-3 text-gray-500 group-hover:text-gray-700" />
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                            {/* Reactions dropdown - overlay */}
                                                            {showReactions && (
                                                                <div className="absolute bottom-full left-0 mb-2 flex gap-1 px-2 py-1.5 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                                                                    {reactionIcons.map((reaction) => {
                                                                        const IconComponent = reaction.icon;
                                                                        const isActive = lineReactions.includes(reaction.id);
                                                                        return (
                                                                            <button
                                                                                key={reaction.id}
                                                                                data-interaction-button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    handleReaction(i, reaction.id);
                                                                                    setShowReactionsForLine(null);
                                                                                }}
                                                                                className={`p-1.5 hover:bg-gray-100 rounded transition-all duration-200 hover:scale-110 ${isActive ? 'bg-gray-50' : ''
                                                                                    }`}
                                                                                title={reaction.label}
                                                                            >
                                                                                <IconComponent className={`w-3.5 h-3.5 ${isActive ? 'text-gray-700' : 'text-gray-500'}`} />
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                                                            <button
                                                                data-interaction-button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    autoDemoRef.current.isRunning = false;
                                                                    if (autoDemoRef.current.timeoutId) {
                                                                        clearTimeout(autoDemoRef.current.timeoutId);
                                                                        autoDemoRef.current.timeoutId = undefined;
                                                                    }
                                                                    setShowReactionsForLine(showReactions ? null : i);
                                                                }}
                                                                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-all duration-200"
                                                            >
                                                                <ThumbsUp className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                data-interaction-button
                                                                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-all duration-200"
                                                            >
                                                                <Copy className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                </>
                            )}

                            {activeTab === 'actions' && (
                                <>
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center space-x-3">
                                            <CheckSquare className="w-5 h-5 text-gray-600" />
                                            <span className="text-sm font-semibold tracking-wide text-gray-900 uppercase">ACTION ITEMS</span>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        {actionItems.map((item, i) => {
                                            const currentAssignee = assignments[item.id] || 'Unassigned';
                                            const assignedParticipant = participants.find(p => p.name === currentAssignee);
                                            const isDropdownOpen = openAssignDropdown === item.id;
                                            const currentStatus = statuses[item.id] || 'todo';
                                            const itemTags = tags[item.id] || [];
                                            const isTagInputOpen = openTagInput === item.id;

                                            return (
                                                <div
                                                    key={i}
                                                    className={`bg-white border rounded-lg p-4 transition-all duration-500 ${selectedAction === `action-${item.id}`
                                                        ? 'border-gray-300 shadow-sm bg-gray-50'
                                                        : 'border-gray-200 hover:bg-gray-50'
                                                        }`}
                                                    onClick={(e) => {
                                                        // Don't trigger selection when clicking interactive elements
                                                        if ((e.target as HTMLElement).closest('[data-assign-button], [data-status-button], [data-tag-button]')) {
                                                            return;
                                                        }
                                                        // Stop auto-demo on user interaction
                                                        autoDemoRef.current.isRunning = false;
                                                        if (autoDemoRef.current.timeoutId) {
                                                            clearTimeout(autoDemoRef.current.timeoutId);
                                                            autoDemoRef.current.timeoutId = undefined;
                                                        }
                                                        setSelectedAction(`action-${item.id}`);
                                                    }}
                                                >
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div className="flex items-center gap-2 flex-1">
                                                            <h3 className="font-medium text-gray-900 transition-colors duration-200">{item.title}</h3>
                                                            {/* Status badge */}
                                                            <div className="relative" data-status-button>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        autoDemoRef.current.isRunning = false;
                                                                        if (autoDemoRef.current.timeoutId) {
                                                                            clearTimeout(autoDemoRef.current.timeoutId);
                                                                            autoDemoRef.current.timeoutId = undefined;
                                                                        }
                                                                        const statusOrder: ('todo' | 'in-progress' | 'done')[] = ['todo', 'in-progress', 'done'];
                                                                        const currentIndex = statusOrder.indexOf(currentStatus);
                                                                        const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length] as 'todo' | 'in-progress' | 'done';
                                                                        handleStatusChange(item.id, nextStatus);
                                                                    }}
                                                                    className={`px-2 py-0.5 text-xs font-medium rounded-full transition-all duration-200 hover:scale-105 ${currentStatus === 'done' ? 'bg-gray-200 text-gray-700' :
                                                                        currentStatus === 'in-progress' ? 'bg-gray-100 text-gray-700' :
                                                                            'bg-gray-100 text-gray-600'
                                                                        }`}
                                                                >
                                                                    {currentStatus === 'done' ? '✓ Done' :
                                                                        currentStatus === 'in-progress' ? '⟳ In Progress' :
                                                                            '○ To Do'}
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <button className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <MoreHorizontal className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                                                        </button>
                                                    </div>
                                                    <p className="text-xs text-gray-600 mb-3 transition-colors duration-200">{item.desc}</p>

                                                    {/* Tags */}
                                                    <div className="flex flex-wrap items-center gap-1.5 mb-3">
                                                        {itemTags.map((tag) => (
                                                            <span
                                                                key={tag}
                                                                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded-full"
                                                            >
                                                                <Tag className="w-2.5 h-2.5" />
                                                                {tag}
                                                                <button
                                                                    data-tag-button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleRemoveTag(item.id, tag);
                                                                    }}
                                                                    className="ml-0.5 hover:text-red-500 transition-colors"
                                                                >
                                                                    <X className="w-2.5 h-2.5" />
                                                                </button>
                                                            </span>
                                                        ))}
                                                        <button
                                                            data-tag-button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                autoDemoRef.current.isRunning = false;
                                                                if (autoDemoRef.current.timeoutId) {
                                                                    clearTimeout(autoDemoRef.current.timeoutId);
                                                                    autoDemoRef.current.timeoutId = undefined;
                                                                }
                                                                setOpenTagInput(isTagInputOpen ? null : item.id);
                                                            }}
                                                            className="inline-flex items-center gap-1 px-2 py-0.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-all duration-200"
                                                        >
                                                            <Tag className="w-2.5 h-2.5" />
                                                            Add tag
                                                        </button>
                                                        {isTagInputOpen && (
                                                            <div className="flex items-center gap-1 px-2 py-0.5 bg-white border border-gray-300 rounded-full">
                                                                <input
                                                                    type="text"
                                                                    value={tagInputValue}
                                                                    onChange={(e) => setTagInputValue(e.target.value)}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter') {
                                                                            handleAddTag(item.id, tagInputValue);
                                                                        }
                                                                        if (e.key === 'Escape') {
                                                                            setOpenTagInput(null);
                                                                            setTagInputValue('');
                                                                        }
                                                                    }}
                                                                    placeholder="Tag name..."
                                                                    className="text-xs outline-none w-20"
                                                                    autoFocus
                                                                />
                                                                {availableTags.filter(t => t.includes(tagInputValue.toLowerCase()) && !itemTags.includes(t)).slice(0, 3).map(suggestedTag => (
                                                                    <button
                                                                        key={suggestedTag}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleAddTag(item.id, suggestedTag);
                                                                        }}
                                                                        className="px-1.5 py-0.5 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                                                                    >
                                                                        {suggestedTag}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex justify-between items-center text-xs">
                                                        <div
                                                            className="relative flex-1"
                                                            ref={(el) => {
                                                                assignDropdownRefs.current[item.id] = el;
                                                            }}
                                                        >
                                                            <button
                                                                data-assign-button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    autoDemoRef.current.isRunning = false;
                                                                    if (autoDemoRef.current.timeoutId) {
                                                                        clearTimeout(autoDemoRef.current.timeoutId);
                                                                        autoDemoRef.current.timeoutId = undefined;
                                                                    }
                                                                    setOpenAssignDropdown(isDropdownOpen ? null : item.id);
                                                                }}
                                                                className="flex items-center gap-2 px-2 py-1.5 rounded-md transition-all duration-200 hover:bg-gray-100 group"
                                                            >
                                                                {assignedParticipant ? (
                                                                    <>
                                                                        <img
                                                                            src={assignedParticipant.avatar}
                                                                            alt={assignedParticipant.name}
                                                                            className="w-5 h-5 rounded-full object-cover"
                                                                        />
                                                                        <span className="text-gray-700 group-hover:text-gray-900 transition-colors">{assignedParticipant.name}</span>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <UserPlus className="w-4 h-4 text-gray-400" />
                                                                        <span className="text-gray-500 group-hover:text-gray-700 transition-colors">Assign to...</span>
                                                                    </>
                                                                )}
                                                                <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                                                            </button>

                                                            {/* Dropdown */}
                                                            {isDropdownOpen && (
                                                                <div className="absolute left-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                                                    <div className="p-2">
                                                                        <div className="text-xs font-semibold text-gray-500 uppercase mb-2 px-2">Assign to</div>
                                                                        {participants.map((participant) => (
                                                                            <button
                                                                                key={participant.name}
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    handleAssign(item.id, participant.name);
                                                                                }}
                                                                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 ${currentAssignee === participant.name
                                                                                    ? 'bg-gray-100'
                                                                                    : 'hover:bg-gray-50'
                                                                                    }`}
                                                                            >
                                                                                <img
                                                                                    src={participant.avatar}
                                                                                    alt={participant.name}
                                                                                    className="w-6 h-6 rounded-full object-cover"
                                                                                />
                                                                                <div className="flex-1 text-left">
                                                                                    <div className="text-sm font-medium text-gray-900">{participant.name}</div>
                                                                                    <div className="text-xs text-gray-500">{participant.role}</div>
                                                                                </div>
                                                                                {currentAssignee === participant.name && (
                                                                                    <CheckSquare className="w-4 h-4 text-gray-600" />
                                                                                )}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <span className="text-gray-500 transition-colors duration-200">Due: {item.due}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            )}

                            {activeTab === 'insights' && (
                                <>
                                    <div className="flex items-center space-x-3 mb-6">
                                        <BarChart3 className="w-5 h-5 text-gray-600" />
                                        <span className="text-sm font-semibold tracking-wide text-gray-900 uppercase">MEETING INSIGHTS</span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                        {insights.map((insight, i) => (
                                            <div
                                                key={i}
                                                className={`p-4 rounded-lg border transition-all duration-500 ${selectedAction === `insight-${i}`
                                                    ? 'bg-gray-100 border-gray-300 shadow-sm'
                                                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100/50'
                                                    }`}
                                            >
                                                <div className="text-2xl font-bold text-gray-900 mb-1 transition-colors duration-200">{insight.value}</div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm text-gray-600 transition-colors duration-200">{insight.metric}</span>
                                                    {insight.trend === 'up' && (
                                                        <span className="text-xs px-2 py-0.5 bg-green-100 text-green-800 rounded-full transition-colors duration-200">↑ Trending</span>
                                                    )}
                                                    {insight.trend === 'new' && (
                                                        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full transition-colors duration-200">New</span>
                                                    )}
                                                    {insight.trend === 'hot' && (
                                                        <span className="text-xs px-2 py-0.5 bg-red-100 text-red-800 rounded-full transition-colors duration-200">Hot</span>
                                                    )}
                                                    {insight.trend === 'optimal' && (
                                                        <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full transition-colors duration-200">Optimal</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 transition-colors duration-200">
                                        <h3 className="font-medium text-gray-900 mb-3 transition-colors duration-200">Key Discussion Topics</h3>
                                        <div className="space-y-2">
                                            {['Login Flow Redesign', 'Social Auth Integration', 'Mobile Responsiveness', 'Security Requirements'].map((topic, i) => (
                                                <div
                                                    key={i}
                                                    className="flex justify-between items-center p-2 bg-white rounded border border-gray-200 hover:bg-gray-50 transition-all duration-200"
                                                >
                                                    <span className="text-sm transition-colors duration-200">{topic}</span>
                                                    <div className="w-16 bg-gray-200 h-1.5 rounded-full overflow-hidden">
                                                        <div
                                                            className="bg-gray-900 h-1.5 rounded-full transition-all duration-500 ease-out"
                                                            style={{ width: `${70 + (i * 7)}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Sidebar - Actions with enhanced UI */}
                        <div className="p-6 bg-gray-50 border-l border-gray-200 lg:col-span-3">
                            <div className="mb-6 text-xs font-semibold tracking-wide text-gray-500 uppercase">DETECTED ACTIONS</div>
                            <div className="space-y-3">
                                <div
                                    className={`bg-white border rounded-lg p-4 transition-all duration-500 cursor-pointer ${selectedAction === 'stories'
                                        ? 'border-gray-300 shadow-sm bg-gray-50'
                                        : 'border-gray-200 hover:bg-gray-50'
                                        }`}
                                    onClick={() => {
                                        // Stop auto-demo on user interaction
                                        autoDemoRef.current.isRunning = false;
                                        if (autoDemoRef.current.timeoutId) {
                                            clearTimeout(autoDemoRef.current.timeoutId);
                                            autoDemoRef.current.timeoutId = undefined;
                                        }
                                        setSelectedAction(selectedAction === 'stories' ? null : 'stories');
                                    }}
                                >
                                    <div className="flex gap-2 items-center mb-2">
                                        <CheckSquare className="w-4 h-4 text-gray-600" />
                                        <span className="text-sm font-medium text-gray-900">Create User Stories</span>
                                    </div>
                                    <div className="mb-3 text-xs text-gray-600">3 stories for login flow epic</div>
                                    <div className="text-xs text-gray-600">Assignee: James Chen • Due: EOD</div>
                                </div>

                                <div
                                    className={`bg-white border rounded-lg p-4 transition-all duration-500 cursor-pointer ${selectedAction === 'prd'
                                        ? 'border-gray-300 shadow-sm bg-gray-50'
                                        : 'border-gray-200 hover:bg-gray-50'
                                        }`}
                                    onClick={() => {
                                        // Stop auto-demo on user interaction
                                        autoDemoRef.current.isRunning = false;
                                        if (autoDemoRef.current.timeoutId) {
                                            clearTimeout(autoDemoRef.current.timeoutId);
                                            autoDemoRef.current.timeoutId = undefined;
                                        }
                                        setSelectedAction(selectedAction === 'prd' ? null : 'prd');
                                    }}
                                >
                                    <div className="flex gap-2 items-center mb-2">
                                        <FileText className="w-4 h-4 text-gray-600" />
                                        <span className="text-sm font-medium text-gray-900">Draft PRD</span>
                                    </div>
                                    <div className="mb-3 text-xs text-gray-600">Login Flow Redesign v2</div>
                                    <div className="text-xs text-gray-500">Status: 95% complete</div>
                                </div>

                                <div
                                    className={`bg-white border rounded-lg p-4 transition-all duration-500 cursor-pointer ${selectedAction === 'sprint'
                                        ? 'border-gray-300 shadow-sm bg-gray-50'
                                        : 'border-gray-200 hover:bg-gray-50'
                                        }`}
                                    onClick={() => {
                                        // Stop auto-demo on user interaction
                                        autoDemoRef.current.isRunning = false;
                                        if (autoDemoRef.current.timeoutId) {
                                            clearTimeout(autoDemoRef.current.timeoutId);
                                            autoDemoRef.current.timeoutId = undefined;
                                        }
                                        setSelectedAction(selectedAction === 'sprint' ? null : 'sprint');
                                    }}
                                >
                                    <div className="flex gap-2 items-center mb-2">
                                        <Target className="w-4 h-4 text-gray-600" />
                                        <span className="text-sm font-medium text-gray-900">Propose Sprint Goal</span>
                                    </div>
                                    <div className="text-xs text-gray-600">Reduce drop-off from 40% → 15%</div>
                                </div>

                                {/* Interactive Export Button */}
                                <button
                                    onClick={handleExport}
                                    disabled={isExporting}
                                    className="flex gap-2 justify-center items-center py-3 mt-4 w-full text-sm font-semibold text-white bg-indigo-600 rounded-lg transition-colors hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {isExporting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Exporting to Jira...
                                        </>
                                    ) : (
                                        <>
                                            Export to Jira
                                            <ArrowRight className="w-4 h-4" />
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* Additional mini-website features */}
                            <div className="mt-6 pt-4 border-t border-gray-200">
                                <h3 className="text-xs font-semibold tracking-wide text-gray-500 mb-3 uppercase">MEETING SUMMARY</h3>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-gray-600">Duration</span>
                                        <span className="text-gray-900">42 min</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-gray-600">Participants</span>
                                        <span className="text-gray-900">4/4</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-gray-600">Action Items</span>
                                        <span className="text-gray-900">3</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-gray-600">Engagement</span>
                                        <span className="text-gray-900">72%</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Enhanced Modal that stays within the component */}
                    {showModal && (
                        <div
                            className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6 z-[100] transition-opacity duration-300"
                            onClick={() => setShowModal(false)}
                        >
                            <div
                                className="p-8 w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-2xl transform transition-all duration-300 scale-100"
                                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
                            >
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-2xl font-bold text-gray-900 font-display transition-colors duration-200">✓ Export Successful</h3>
                                    <button
                                        onClick={() => setShowModal(false)}
                                        className="flex justify-center items-center w-8 h-8 bg-gray-100 rounded-full transition-colors hover:bg-gray-200"
                                    >
                                        <X className="w-4 h-4 text-gray-600" />
                                    </button>
                                </div>

                                <div className="mb-6 space-y-3 text-sm text-gray-700">
                                    <div className="flex gap-3 items-center transition-transform duration-200 hover:translate-x-1">
                                        <div className="w-2 h-2 bg-gray-900 rounded-full transition-colors duration-200"></div>
                                        <span>3 user stories created in Jira backlog</span>
                                    </div>
                                    <div className="flex gap-3 items-center transition-transform duration-200 hover:translate-x-1">
                                        <div className="w-2 h-2 bg-gray-900 rounded-full transition-colors duration-200"></div>
                                        <span>PRD attached to "Login Flow Redesign" epic</span>
                                    </div>
                                    <div className="flex gap-3 items-center transition-transform duration-200 hover:translate-x-1">
                                        <div className="w-2 h-2 bg-gray-900 rounded-full transition-colors duration-200"></div>
                                        <span>Sprint goal added to team board</span>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowModal(false)}
                                        className="flex-1 py-3 font-medium text-gray-700 bg-gray-100 rounded-lg transition-colors hover:bg-gray-200"
                                    >
                                        Close
                                    </button>
                                    <button
                                        // onClick={() => window.open('https://jira.com', '_blank')}
                                        className="flex flex-1 gap-2 justify-center items-center py-3 font-medium text-white bg-indigo-600 rounded-lg transition-colors hover:bg-indigo-700"
                                    >
                                        View in Jira
                                        <ChevronRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Trust badges - muted */}
                <div className="flex flex-wrap gap-8 justify-center items-center mt-8 text-sm text-gray-600">
                    <div className="flex gap-2 items-center">
                        <Shield className="w-4 h-4 text-gray-500" />
                        <span>End-to-end encrypted</span>
                    </div>
                    <div className="flex gap-2 items-center">
                        <Zap className="w-4 h-4 text-gray-500" />
                        <span>Sub-second latency</span>
                    </div>
                    <div className="flex gap-2 items-center">
                        <Users className="w-4 h-4 text-gray-500" />
                        <span>1,000+ teams</span>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default TranscriptionBlock;

