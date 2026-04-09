import React, { useState } from 'react';
import { Highlighter } from '../components/effects/Highlighter';
import { formatDate } from '../components/changelog/lib/utils';

interface BlogPost {
  id: number;
  title: string;
  excerpt: string;
  content: string;
  date: string;
  readTime: string;
  tags: string[];
  author: string;
  category: string;
}

const BlogPage: React.FC = () => {
  const blogPosts: BlogPost[] = [
    {
      id: 1,
      title: "How to Run More Effective Meetings",
      excerpt: "Learn practical strategies to make your meetings more productive and engaging.",
      content: "In this comprehensive guide, we'll explore how to structure meetings that deliver real value. We'll cover everything from agenda setting to follow-up actions. The key is preparation, clear objectives, and keeping your meetings focused on outcomes rather than just discussion. Whether you're running daily standups or quarterly planning sessions, these principles will help you make the most of everyone's time.",
      date: "2025-01-15",
      readTime: "5 min read",
      tags: ["Productivity", "Meetings", "Teamwork"],
      author: "Ayush Yadav",
      category: "Productivity"
    },
    {
      id: 2,
      title: "The Future of Meeting Transcription Technology",
      excerpt: "Exploring how AI is changing the landscape of meeting transcription and analysis.",
      content: "Meeting transcription technology has evolved dramatically in recent years. What started as simple voice-to-text conversion has transformed into intelligent systems that can identify speakers, extract key insights, and even predict action items. The latest AI models can now understand context, differentiate between multiple speakers in real-time, and generate actionable summaries from complex discussions.",
      date: "2024-12-20",
      readTime: "7 min read",
      tags: ["AI", "Technology", "Innovation"],
      author: "Swapnil Patil",
      category: "Technology"
    },
    {
      id: 3,
      title: "Best Practices for Remote Team Collaboration",
      excerpt: "Tips and tools to help your remote team communicate and collaborate effectively.",
      content: "Remote work has become the new standard for many organizations. Success in this environment requires intentional strategies for communication and collaboration. The key is to over-communicate, use the right tools for different types of interactions, and create structures that foster connection and accountability. Trust and clarity become even more important when you can't rely on in-person interactions.",
      date: "2024-11-25",
      readTime: "6 min read",
      tags: ["Remote Work", "Collaboration", "Teamwork"],
      author: "Sumeet Gond",
      category: "Remote Work"
    },
    {
      id: 4,
      title: "Turning Meeting Notes into Action Items",
      excerpt: "A guide to ensuring your meeting discussions lead to concrete outcomes.",
      content: "One of the biggest challenges in meetings is ensuring that discussions lead to actionable outcomes. The most effective meetings have clear next steps, assigned responsibilities, and deadlines. This article explores techniques for capturing commitments during meetings and converting them into trackable action items that drive progress.",
      date: "2024-10-30",
      readTime: "4 min read",
      tags: ["Productivity", "Action Items", "Project Management"],
      author: "Ayush Yadav",
      category: "Productivity"
    },
    {
      id: 5,
      title: "The Role of AI in Modern Product Management",
      excerpt: "How artificial intelligence is transforming how PMs analyze data and make decisions.",
      content: "Product managers today have unprecedented access to data, but the challenge is extracting meaningful insights from this information. AI tools now help PMs identify patterns in user feedback, predict feature adoption, and automate routine tasks. The result is more time for strategic thinking and less time on manual analysis.",
      date: "2024-09-15",
      readTime: "8 min read",
      tags: ["AI", "Product Management", "Strategy"],
      author: "Swapnil Patil",
      category: "Product Management"
    },
    {
      id: 6,
      title: "Creating Effective Meeting Agendas",
      excerpt: "Learn the essential elements that make a meeting agenda truly effective.",
      content: "An effective meeting agenda is more than just a list of topics to discuss. It should include clear objectives, time allocations for each item, and pre-read materials when necessary. The best agendas also indicate which items require decision-making versus information sharing, and they specify who should contribute to each section.",
      date: "2024-08-22",
      readTime: "5 min read",
      tags: ["Meetings", "Productivity", "Planning"],
      author: "Sumeet Gond",
      category: "Planning"
    }
  ];

  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const allTags = Array.from(
    new Set(
      blogPosts.flatMap(post => post.tags)
    )
  );

  const filteredPosts = blogPosts.filter(post => {
    const matchesTag = selectedTag ? post.tags.includes(selectedTag) : true;
    const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          post.excerpt.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTag && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-white pt-20">
      {/* Decorative background elements */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-indigo-100 rounded-full opacity-20 blur-3xl"></div>
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-cyan-100 rounded-full opacity-20 blur-3xl"></div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            <Highlighter
              action="underline"
              color="#6b7280"
              strokeWidth={3}
              padding={5}
              animationDuration={1000}
              isView={true}
              delay={100}
            >
              Zeta Blog
            </Highlighter>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            <Highlighter
              action="highlight"
              color="#e5e7eb"
              strokeWidth={2}
              padding={4}
              animationDuration={800}
              isView={true}
              delay={200}
            >
              Insights and best practices for better meetings and product management
            </Highlighter>
          </p>

          {/* Search and Filter */}
          <div className="max-w-2xl mx-auto mt-10">
            <div className="relative">
              <input
                type="text"
                placeholder="Search articles..."
                className="w-full px-4 py-3 pl-12 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <svg 
                className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth="2" 
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
                />
              </svg>
            </div>

            <div className="flex flex-wrap justify-center gap-2 mt-6">
              <button
                className={`px-4 py-2 rounded-full text-sm font-medium ${
                  selectedTag === null
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                onClick={() => setSelectedTag(null)}
              >
                All Posts
              </button>
              {allTags.map((tag, index) => (
                <button
                  key={index}
                  className={`px-4 py-2 rounded-full text-sm font-medium ${
                    selectedTag === tag
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Blog Posts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredPosts.map((post, index) => (
            <article 
              key={post.id} 
              className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-300"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-indigo-600">
                    {post.category}
                  </span>
                  <span className="text-sm text-gray-500">
                    {formatDate(new Date(post.date))}
                  </span>
                </div>

                <h2 className="text-xl font-bold mb-3 line-clamp-2">
                  <Highlighter
                    action="underline"
                    color="#6366f1"
                    strokeWidth={2.5}
                    padding={3}
                    animationDuration={700}
                    isView={true}
                    delay={300 + (index * 50)}
                  >
                    {post.title}
                  </Highlighter>
                </h2>

                <p className="text-gray-600 mb-4 line-clamp-3">
                  <Highlighter
                    action="highlight"
                    color="#f3f4f6"
                    strokeWidth={1.5}
                    padding={3}
                    animationDuration={600}
                    isView={true}
                    delay={400 + (index * 50)}
                  >
                    {post.excerpt}
                  </Highlighter>
                </p>

                <div className="flex flex-wrap gap-2 mb-4">
                  {post.tags.map((tag, tagIndex) => (
                    <span 
                      key={tagIndex}
                      className="px-3 py-1 text-xs font-medium bg-indigo-50 text-indigo-700 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold mr-2">
                      {post.author.split(' ').map(n => n[0]).join('')}
                    </div>
                    <span className="text-sm text-gray-600">{post.author}</span>
                  </div>
                  <span className="text-sm text-gray-500">{post.readTime}</span>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* Empty state when no posts match filters */}
        {filteredPosts.length === 0 && (
          <div className="text-center py-16">
            <h3 className="text-xl font-semibold mb-2">
              <Highlighter
                action="highlight"
                color="#fef3c7"
                strokeWidth={2}
                padding={4}
                animationDuration={600}
                isView={true}
              >
                No posts found
              </Highlighter>
            </h3>
            <p className="text-gray-600">
              Try adjusting your search or filter to find what you're looking for.
            </p>
          </div>
        )}

        {/* Newsletter CTA */}
        <div className="mt-20 bg-gradient-to-r from-indigo-50 to-cyan-50 rounded-2xl p-8 md:p-12 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            <Highlighter
              action="underline"
              color="#10b981"
              strokeWidth={3}
              isView={true}
              delay={300}
            >
              Stay Updated
            </Highlighter>
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto mb-6">
            Get the latest insights on meeting productivity and product management delivered straight to your inbox.
          </p>
          <div className="max-w-md mx-auto flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <button className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors">
              Subscribe
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlogPage;