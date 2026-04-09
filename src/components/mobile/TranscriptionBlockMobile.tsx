import React, { useState } from 'react';
import { FileText, CheckSquare, Shield, Zap, Users, X, Loader2, ArrowRight, BarChart3, Search, MoreHorizontal, Copy } from 'lucide-react';

const TranscriptionBlockMobile: React.FC = () => {
    const [showModal, setShowModal] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [selectedAction, setSelectedAction] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'transcript' | 'actions' | 'insights'>('transcript');
    const [searchQuery, setSearchQuery] = useState('');

    const handleExport = () => {
        setIsExporting(true);
        setTimeout(() => {
            setIsExporting(false);
            setShowModal(true);
        }, 1500);
    };

    // Mock data for mobile version
    const participants = [
        { name: "Sarah Chen", role: "Product Manager", active: true, avatar: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=400&h=400&fit=crop&q=80" },
        { name: "Marcus Johnson", role: "Lead Engineer", active: false, avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&q=80" },
        { name: "Priya Patel", role: "UX Designer", active: true, avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop&q=80" },
        { name: "Emily Rodriguez", role: "VP Product", active: true, avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&q=80" }
    ];

    const transcript = [
        { time: "14:28", speaker: "Sarah", color: "text-gray-900", text: "We need to prioritize the login flow redesign. Users are dropping off at 40% rate." },
        { time: "14:29", speaker: "Marcus", color: "text-gray-700", text: "Can we break that into three stories? Social auth, password reset, and magic link?" },
        { time: "14:31", speaker: "Priya", color: "text-gray-700", text: "I have mockups ready. Can share after this call. Social auth should be first—users keep requesting it." },
        { time: "14:32", speaker: "Emily", color: "text-gray-900", text: "Agreed. Let's scope it to 2-week sprint. Sarah, can you create the stories by EOD?" },
        { time: "14:35", speaker: "Marcus", color: "text-gray-700", text: "Also consider mobile responsiveness. We've had feedback on the mobile experience." },
        { time: "14:36", speaker: "Sarah", color: "text-gray-900", text: "Good point. I'll add that to the epic description." }
    ];

    const actionItems = [
        { id: 'stories', title: 'Create User Stories', desc: '3 stories for login flow epic', assignee: 'Sarah Chen', due: 'EOD' },
        { id: 'prd', title: 'Draft PRD', desc: 'Login Flow Redesign v2', assignee: 'Sarah Chen', due: 'Tomorrow' },
        { id: 'sprint', title: 'Propose Sprint Goal', desc: 'Reduce drop-off from 40% → 15%', assignee: 'Sarah Chen', due: 'This Week' }
    ];

    // Enhanced data for insights
    const insights = [
        { metric: 'Engagement', value: '72%', trend: 'up' },
        { metric: 'Action Items', value: '4', trend: 'new' },
        { metric: 'Key Topic', value: 'Login Flow', trend: 'hot' },
        { metric: 'Meeting Duration', value: '42 min', trend: 'optimal' }
    ];

    return (
        <section className="pt-4 pb-8 bg-gray-50 -mx-4 px-4">
            <div className="w-full">
                <div className="overflow-hidden relative bg-white rounded-2xl shadow-lg border border-gray-200">
                    {/* Header with macOS-style buttons */}
                    <div className="flex justify-between items-center px-4 py-3 bg-gray-50">
                        <div className="flex gap-2">
                            <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                            <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                            <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                        </div>
                        <div></div>
                    </div>

                    {/* Minimalist tab navigation for mobile */}
                    <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mx-4 my-3">
                        {([
                            { id: 'transcript' as const, label: 'Transcript', icon: FileText },
                            { id: 'actions' as const, label: 'Actions', icon: CheckSquare },
                            { id: 'insights' as const, label: 'Insights', icon: BarChart3 }
                        ] as const).map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex-1 flex items-center justify-center py-2 text-xs font-medium transition-all ${
                                        activeTab === tab.id
                                            ? 'bg-white text-gray-900 rounded-md shadow-sm'
                                            : 'text-gray-600'
                                    }`}
                                >
                                    <Icon className="w-4 h-4 mr-1" />
                                    <span>{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Mobile-optimized content */}
                    <div className="max-h-[60vh] overflow-y-auto px-4 pb-4">
                        {activeTab === 'transcript' && (
                            <div>
                                <div className="mb-3">
                                    <div className="relative mb-3">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                        <input
                                            type="text"
                                            placeholder="Search..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-gray-300 transition-all"
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
                                        .map((line, i) => (
                                            <div
                                                key={i}
                                                className={`p-3 rounded-xl border-l-4 transition-all duration-200 cursor-pointer ${
                                                    selectedAction === `line-${i}` 
                                                        ? 'bg-blue-50 border-l-blue-400 shadow-sm' 
                                                        : 'bg-gray-50 border-l-gray-300'
                                                }`}
                                                onClick={() => setSelectedAction(`line-${i}`)}
                                            >
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-xs font-medium text-gray-500">{line.time}</span>
                                                    <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-400 hover:text-gray-600">
                                                        <Copy className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                <div>
                                                    <span className={`font-semibold text-sm ${line.color}`}>{line.speaker}:</span>
                                                    <span className="ml-2 text-sm text-gray-700">{line.text}</span>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        )}

                        {activeTab === 'actions' && (
                            <div>
                                <div className="space-y-3">
                                    {actionItems.map((item, i) => (
                                        <div
                                            key={i}
                                            className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
                                                selectedAction === `action-${item.id}` 
                                                    ? 'bg-blue-50 border-blue-200' 
                                                    : 'bg-gray-50 border-gray-200'
                                            }`}
                                            onClick={() => setSelectedAction(`action-${item.id}`)}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className="font-medium text-gray-900">{item.title}</h3>
                                                <button>
                                                    <MoreHorizontal className="w-4 h-4 text-gray-400" />
                                                </button>
                                            </div>
                                            <p className="text-xs text-gray-600 mb-2">{item.desc}</p>
                                            <div className="flex justify-between text-xs text-gray-500">
                                                <span>Assignee: {item.assignee}</span>
                                                <span>Due: {item.due}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                
                                {/* Export button at the bottom for actions tab */}
                                <button
                                    onClick={handleExport}
                                    disabled={isExporting}
                                    className="w-full mt-4 py-3 text-sm font-semibold text-white bg-indigo-600 rounded-xl transition-colors hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {isExporting ? (
                                        <div className="flex items-center justify-center">
                                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                            Exporting to Jira...
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center">
                                            <span>Export to Jira</span>
                                            <ArrowRight className="w-4 h-4 ml-2" />
                                        </div>
                                    )}
                                </button>
                            </div>
                        )}

                        {activeTab === 'insights' && (
                            <div>
                                <div className="grid grid-cols-2 gap-3 mb-4">
                                    {insights.map((insight, i) => (
                                        <div 
                                            key={i} 
                                            className="p-3 bg-gray-50 rounded-xl border border-gray-200"
                                        >
                                            <div className="text-lg font-bold text-gray-900 mb-1">{insight.value}</div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs text-gray-600">{insight.metric}</span>
                                                {insight.trend === 'up' && (
                                                    <span className="text-[0.6rem] px-1.5 py-0.5 bg-green-100 text-green-800 rounded-full">↑</span>
                                                )}
                                                {insight.trend === 'new' && (
                                                    <span className="text-[0.6rem] px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded-full">NEW</span>
                                                )}
                                                {insight.trend === 'hot' && (
                                                    <span className="text-[0.6rem] px-1.5 py-0.5 bg-red-100 text-red-800 rounded-full">HOT</span>
                                                )}
                                                {insight.trend === 'optimal' && (
                                                    <span className="text-[0.6rem] px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded-full">✓</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="bg-gray-50 rounded-xl border border-gray-200 p-3">
                                    <h3 className="font-medium text-gray-900 mb-2 text-sm">Discussion Topics</h3>
                                    <div className="space-y-2">
                                        {['Login Flow', 'Social Auth', 'Mobile UX', 'Security'].map((topic, i) => (
                                            <div 
                                                key={i} 
                                                className="flex justify-between items-center p-2 bg-white rounded-lg border border-gray-200"
                                            >
                                                <span className="text-xs">{topic}</span>
                                                <div className="w-16 bg-gray-200 h-1.5 rounded-full overflow-hidden">
                                                    <div 
                                                        className="bg-gray-900 h-1.5 rounded-full transition-all duration-500 ease-out" 
                                                        style={{ width: `${70 + (i * 8)}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Participants section at the bottom for mobile */}
                    <div className="p-4 bg-gray-50 border-t border-gray-200">
                        <div className="mb-2 text-xs font-semibold tracking-wide text-gray-500 uppercase">PARTICIPANTS</div>
                        <div className="flex overflow-x-auto space-x-3 pb-1">
                            {participants.map((p, i) => (
                                <div
                                    key={i}
                                    className="flex-shrink-0 flex flex-col items-center"
                                    onClick={() => setSelectedAction(`participant-${i}`)}
                                >
                                    <div className="relative">
                                        <img src={p.avatar} alt={p.name} className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-sm" />
                                        {p.active && (
                                            <div className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 rounded-full border border-white"></div>
                                        )}
                                    </div>
                                    <div className="text-xs mt-1 text-center max-w-[60px] truncate">{p.name.split(' ')[0]}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Trust badges - optimized for mobile */}
                <div className="flex flex-wrap gap-3 justify-center items-center mt-4 text-xs text-gray-600">
                    <div className="flex gap-1 items-center px-3 py-1.5 bg-white rounded-full border border-gray-200">
                        <Shield className="w-3 h-3 text-gray-500" />
                        <span>Encrypted</span>
                    </div>
                    <div className="flex gap-1 items-center px-3 py-1.5 bg-white rounded-full border border-gray-200">
                        <Zap className="w-3 h-3 text-gray-500" />
                        <span>Fast</span>
                    </div>
                    <div className="flex gap-1 items-center px-3 py-1.5 bg-white rounded-full border border-gray-200">
                        <Users className="w-3 h-3 text-gray-500" />
                        <span>1000+ teams</span>
                    </div>
                </div>
            </div>

            {/* Enhanced Modal that stays within the component */}
            {showModal && (
                <div 
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[100]"
                    onClick={() => setShowModal(false)}
                >
                    <div 
                        className="w-full max-w-sm bg-white rounded-2xl border border-gray-200 shadow-2xl"
                        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
                    >
                        <div className="p-5">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-lg font-bold text-gray-900">✓ Export Successful</h3>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="flex justify-center items-center w-7 h-7 bg-gray-100 rounded-full transition-colors hover:bg-gray-200"
                                >
                                    <X className="w-4 h-4 text-gray-600" />
                                </button>
                            </div>

                            <div className="mb-5 space-y-2 text-sm text-gray-700">
                                <div className="flex gap-2 items-center">
                                    <div className="w-2 h-2 bg-gray-900 rounded-full"></div>
                                    <span>3 user stories created in Jira</span>
                                </div>
                                <div className="flex gap-2 items-center">
                                    <div className="w-2 h-2 bg-gray-900 rounded-full"></div>
                                    <span>PRD attached to epic</span>
                                </div>
                                <div className="flex gap-2 items-center">
                                    <div className="w-2 h-2 bg-gray-900 rounded-full"></div>
                                    <span>Goal added to board</span>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2">
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="w-full py-2.5 font-medium text-gray-700 bg-gray-100 rounded-lg transition-colors hover:bg-gray-200"
                                >
                                    Close
                                </button>
                                <button
                                    onClick={() => window.open('https://jira.com', '_blank')}
                                    className="w-full py-2.5 font-medium text-white bg-indigo-600 rounded-lg transition-colors hover:bg-indigo-700"
                                >
                                    View in Jira
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
};

export default TranscriptionBlockMobile;