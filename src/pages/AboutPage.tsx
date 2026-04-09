import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Highlighter } from '../components/effects/Highlighter';
import { ArrowRight } from 'lucide-react';

const AboutPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white pt-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero section */}
        <div className="text-center py-16 md:py-24 lg:py-28">
          <h1 className="mb-8 text-5xl font-bold tracking-tight leading-tight text-gray-900 font-display sm:text-6xl lg:text-7xl">
            About{' '}
            <Highlighter
              action="box"
              color="#6366f1"
              strokeWidth={2.7}
              padding={8}
              animationDuration={3000}
              isView={true}
            >
              Zeta
            </Highlighter>
          </h1>
          <p className="mx-auto mb-6 max-w-4xl text-lg font-medium leading-snug text-center text-gray-600 sm:text-xl md:text-2xl">
            Your{' '}
            <Highlighter
              action="underline"
              color="#6366f1"
              strokeWidth={2.5}
              padding={4}
              animationDuration={800}
              delay={200}
              isView={true}
            >
              AI-powered Product Manager
            </Highlighter>
            {' '}agent that{' '}
            <Highlighter
              action="circle"
              color="#10b981"
              strokeWidth={3}
              padding={8}
              animationDuration={1000}
              delay={500}
              isView={true}
            >
              transforms meetings
            </Highlighter>
            {' '}into{' '}
            <Highlighter
              action="highlight"
              color="#fef3c7"
              padding={6}
              animationDuration={800}
              delay={800}
              isView={true}
            >
              actionable insights
            </Highlighter>
            .
          </p>
        </div>

        {/* Mission Section */}
        <div className="py-16 border-t border-gray-200">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-12 text-gray-900">
              Our Mission
            </h2>
            <div className="bg-gray-50 rounded-xl p-8 md:p-10">
              <p className="text-base md:text-lg text-gray-700 leading-relaxed text-center">
                We believe that{' '}
                <Highlighter action="highlight" color="#fef3c7" isView={true} padding={4}>
                  every spoken word
                </Highlighter>{' '}
                has value and should be preserved and analyzed to drive better outcomes. Zeta transforms the way teams work by{' '}
                <Highlighter action="highlight" color="#fef3c7" isView={true} padding={4} delay={400}>
                  automating
                </Highlighter>{' '}
                meeting documentation, PRD generation, user story creation, and sprint planning.
              </p>

              <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                <div className="p-5 bg-white rounded-lg">
                  <h3 className="font-semibold text-base mb-2 text-gray-900">
                    Join meetings
                  </h3>
                  <p className="text-sm text-gray-600">Automatically attend meetings and transcribe conversations</p>
                </div>

                <div className="p-5 bg-white rounded-lg">
                  <h3 className="font-semibold text-base mb-2 text-gray-900">
                    Generate PRDs
                  </h3>
                  <p className="text-sm text-gray-600">Convert discussions into structured product documentation</p>
                </div>

                <div className="p-5 bg-white rounded-lg">
                  <h3 className="font-semibold text-base mb-2 text-gray-900">
                    Create stories
                  </h3>
                  <p className="text-sm text-gray-600">Transform insights into user stories and action items</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Journey Section */}
        <div className="py-16">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-16 text-gray-900">
              The Origin Story
            </h2>

            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-0.5 bg-gray-200 hidden md:block"></div>

              <div className="space-y-16 md:space-y-0">
                {/* Timeline item 1 */}
                <div className="md:flex items-center gap-12 mb-16 md:mb-20">
                  <div className="md:w-1/2 md:pr-10 md:text-right">
                    <div className="inline-block p-5 bg-gray-50 rounded-lg border border-gray-200">
                      <h3 className="text-lg font-bold text-gray-900 mb-2">
                        <a href="https://heizen.work" target="_blank" rel="noopener noreferrer" className="text-gray-900 hover:text-indigo-600 transition-colors">
                          Heizen Inspiration
                        </a>
                      </h3>
                      <p className="text-sm text-gray-500 font-medium">July 2025</p>
                    </div>
                  </div>

                  <div className="md:w-1/2 md:pl-10 mt-6 md:mt-0">
                    <div className="w-5 h-5 rounded-full bg-indigo-600 border-3 border-white shadow-md absolute left-1/2 transform -translate-x-1/2 hidden md:block"></div>
                    <p className="text-base text-gray-600 leading-relaxed">
                      While working at <a href="https://heizen.work" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-700 transition-colors font-medium">Heizen (formerly Open Gig)</a>, Ayush saw their internal "PM Agent" tool sync progress across 100+ employees worldwide and handle daily standups. Impressive, but with{' '}
                      <Highlighter action="highlight" color="#fef3c7" isView={true} padding={4} delay={500}>
                        significant flaws
                      </Highlighter>.
                    </p>
                  </div>
                </div>

                {/* Timeline item 2 */}
                <div className="md:flex items-center gap-12 mb-16 md:mb-20">
                  <div className="md:w-1/2 md:order-2 md:pl-10">
                    <div className="inline-block p-5 bg-gray-50 rounded-lg border border-gray-200">
                      <h3 className="text-lg font-bold text-gray-900 mb-2">
                        <a href="https://anaqua.com" target="_blank" rel="noopener noreferrer" className="text-gray-900 hover:text-indigo-600 transition-colors">
                          Anaqua Journey
                        </a>
                      </h3>
                      <p className="text-sm text-gray-500 font-medium">September 2025</p>
                    </div>
                  </div>

                  <div className="md:w-1/2 md:order-1 md:pr-10 mt-6 md:mt-0">
                    <div className="w-5 h-5 rounded-full bg-indigo-600 border-3 border-white shadow-md absolute left-1/2 transform -translate-x-1/2 hidden md:block"></div>
                    <p className="text-base text-gray-600 leading-relaxed">
                      After leaving Heizen, Ayush joined <a href="https://anaqua.com" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-700 transition-colors font-medium">Anaqua</a> where they built an internal PM tool, but it{' '}
                      <Highlighter action="underline" color="#6366f1" isView={true} strokeWidth={2} padding={4} delay={700}>
                        wasn't as efficient
                      </Highlighter>{' '}
                      as hoped. This reinforced the market need.
                    </p>
                  </div>
                </div>

                {/* Timeline item 3 */}
                <div className="md:flex items-center gap-12 mb-16 md:mb-20">
                  <div className="md:w-1/2 md:pr-10 md:text-right">
                    <div className="inline-block p-5 bg-gray-50 rounded-lg border border-gray-200">
                      <h3 className="text-lg font-bold text-gray-900 mb-2">
                        <a href="https://github.com/Vexa-ai/vexa" target="_blank" rel="noopener noreferrer" className="text-gray-900 hover:text-indigo-600 transition-colors">
                          Vexa.ai Discovery
                        </a>
                      </h3>
                      <p className="text-sm text-gray-500 font-medium">Late 2025</p>
                    </div>
                  </div>

                  <div className="md:w-1/2 md:pl-10 mt-6 md:mt-0">
                    <div className="w-5 h-5 rounded-full bg-indigo-600 border-3 border-white shadow-md absolute left-1/2 transform -translate-x-1/2 hidden md:block"></div>
                    <p className="text-base text-gray-600 leading-relaxed">
                      Discovered{' '}
                      <Highlighter action="highlight" color="#fef3c7" isView={true} padding={4} delay={1000}>
                        Vexa.ai
                      </Highlighter>
                      , an open source meeting transcription tool, which{' '}
                      <Highlighter action="highlight" color="#fef3c7" isView={true} padding={4} delay={1100}>
                        accelerated our development
                      </Highlighter>{' '}
                      of the product.
                    </p>
                  </div>
                </div>

                {/* Timeline item 4 */}
                <div className="md:flex items-center gap-12 mb-16 md:mb-20">
                  <div className="md:w-1/2 md:order-2 md:pl-10">
                    <div className="inline-block p-5 bg-gray-50 rounded-lg border border-gray-200">
                      <h3 className="text-lg font-bold text-gray-900 mb-2">
                        Zeta Ideation
                      </h3>
                      <p className="text-sm text-gray-500 font-medium">August 2025</p>
                    </div>
                  </div>

                  <div className="md:w-1/2 md:order-1 md:pr-10 mt-6 md:mt-0">
                    <div className="w-5 h-5 rounded-full bg-indigo-600 border-3 border-white shadow-md absolute left-1/2 transform -translate-x-1/2 hidden md:block"></div>
                    <p className="text-base text-gray-600 leading-relaxed">
                      After 2 months of{' '}
                      <Highlighter action="circle" color="#10b981" isView={true} strokeWidth={2} padding={8} delay={1400}>
                        R&D
                      </Highlighter>
                      , Zeta ideation began in August 2025.{' '}
                      <span className="inline-block mx-1">
                        <Highlighter action="highlight" color="#fef3c7" isView={true} padding={8} delay={1600}>
                          Sumeet
                        </Highlighter>
                      </span>
                      {' '}and{' '}
                      <span className="inline-block mx-1">
                        <Highlighter action="highlight" color="#fef3c7" isView={true} padding={8} delay={1700}>
                          Swapnil
                        </Highlighter>
                      </span>
                      {' '}joined the mission, fascinated by the productivity boost they saw while serving freelance clients.
                    </p>
                  </div>
                </div>

                {/* Timeline item 5 */}
                <div className="md:flex items-center gap-12 mb-16 md:mb-20">
                  <div className="md:w-1/2 md:pr-10 md:text-right">
                    <div className="inline-block p-5 bg-gray-50 rounded-lg border border-gray-200">
                      <h3 className="text-lg font-bold text-gray-900 mb-2">
                        Early Testing
                      </h3>
                      <p className="text-sm text-gray-500 font-medium">Late 2025</p>
                    </div>
                  </div>

                  <div className="md:w-1/2 md:pl-10 mt-6 md:mt-0">
                    <div className="w-5 h-5 rounded-full bg-indigo-600 border-3 border-white shadow-md absolute left-1/2 transform -translate-x-1/2 hidden md:block"></div>
                    <p className="text-base text-gray-600 leading-relaxed">
                      First tested Zeta during hackathons. It helped us{' '}
                      <span className="inline-block mx-0.5">
                        <Highlighter action="highlight" color="#fef3c7" isView={true} padding={8} delay={2000}>
                          one-shot the PRDs
                        </Highlighter>
                      </span>
                      {' '}and{' '}
                      <span className="inline-block mx-0.5">
                        <Highlighter action="highlight" color="#fef3c7" isView={true} padding={8} delay={2100}>
                          ideate standout features
                        </Highlighter>
                      </span>
                      {' '}effortlessly.
                    </p>
                  </div>
                </div>

                {/* Timeline item 6 */}
                <div className="md:flex items-center gap-12 mb-16 md:mb-20">
                  <div className="md:w-1/2 md:order-2 md:pl-10">
                    <div className="inline-block p-5 bg-gray-50 rounded-lg border border-gray-200">
                      <h3 className="text-lg font-bold text-gray-900 mb-2">
                        Beta Development
                      </h3>
                      <p className="text-sm text-gray-500 font-medium">November 2025</p>
                    </div>
                  </div>

                  <div className="md:w-1/2 md:order-1 md:pr-10 mt-6 md:mt-0">
                    <div className="w-5 h-5 rounded-full bg-indigo-600 border-3 border-white shadow-md absolute left-1/2 transform -translate-x-1/2 hidden md:block"></div>
                    <p className="text-base text-gray-600 leading-relaxed">
                      Started{' '}
                      <Highlighter action="underline" color="#6366f1" isView={true} strokeWidth={2} padding={4} delay={2200}>
                        beta development
                      </Highlighter>{' '}
                      in November 2025. Currently working on beta preview release. We tested using a pilot version which was simpler and problem focused.
                    </p>
                  </div>
                </div>

                {/* Timeline item 7 */}
                <div className="md:flex items-center gap-12">
                  <div className="md:w-1/2 md:pr-10 md:text-right">
                    <div className="inline-block p-5 bg-gray-50 rounded-lg border border-gray-200">
                      <h3 className="text-lg font-bold text-gray-900 mb-2">
                        <a href="/changelog" className="text-gray-900 hover:text-indigo-600 transition-colors">
                          Current Phase
                        </a>
                      </h3>
                      <p className="text-sm text-gray-500 font-medium mb-4">2025-Present</p>
                      <button
                        onClick={() => navigate('/changelog')}
                        className="inline-flex gap-2 items-center px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg transition-colors hover:bg-indigo-700"
                      >
                        View Changelog
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="md:w-1/2 md:pl-10 mt-6 md:mt-0">
                    <div className="w-5 h-5 rounded-full bg-indigo-600 border-3 border-white shadow-md absolute left-1/2 transform -translate-x-1/2 hidden md:block"></div>
                    <p className="text-base text-gray-600 leading-relaxed">
                      Working on <a href="/changelog" className="text-indigo-600 hover:text-indigo-700 transition-colors font-medium">beta preview release</a> with continuous improvements. We're ready to{' '}
                      <Highlighter action="circle" color="#10b981" isView={true} strokeWidth={2.5} padding={8} delay={2600}>
                        scale to millions
                      </Highlighter>
                      . Startup-only right now for{' '}
                      <span className="inline-block mx-1">
                        <Highlighter action="highlight" color="#fef3c7" isView={true} padding={8} delay={2700}>
                          personalized support
                        </Highlighter>
                      </span>
                      {' '}and{' '}
                      <span className="inline-block mx-1">
                        <Highlighter action="highlight" color="#fef3c7" isView={true} padding={8} delay={2800}>
                          rapid ticket clearances
                        </Highlighter>
                      </span>.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Team Section */}
        <div className="py-16 border-t border-gray-200">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-12 text-gray-900">
              The Team
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="relative inline-block mb-4">
                  <Highlighter
                    action="box"
                    color="#6366f1"
                    strokeWidth={3}
                    padding={12}
                    isView={true}
                    delay={300}
                  >
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold">
                      A
                    </div>
                  </Highlighter>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  Ayush
                </h3>
                <p className="text-sm text-gray-600">
                  <Highlighter action="highlight" color="#fef3c7" isView={true} padding={3} delay={400}>
                    Creator & AI Lead
                  </Highlighter>
                </p>
              </div>

              <div className="text-center">
                <div className="relative inline-block mb-4">
                  <Highlighter
                    action="box"
                    color="#6366f1"
                    strokeWidth={3}
                    padding={12}
                    isView={true}
                    delay={500}
                  >
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold">
                      S
                    </div>
                  </Highlighter>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  Swapnil
                </h3>
                <p className="text-sm text-gray-600">
                  <Highlighter action="highlight" color="#fef3c7" isView={true} padding={3} delay={600}>
                    Co-creator & Backend Lead
                  </Highlighter>
                </p>
              </div>

              <div className="text-center">
                <div className="relative inline-block mb-4">
                  <Highlighter
                    action="box"
                    color="#6366f1"
                    strokeWidth={3}
                    padding={12}
                    isView={true}
                    delay={700}
                  >
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold">
                      S
                    </div>
                  </Highlighter>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  Sumeet
                </h3>
                <p className="text-sm text-gray-600">
                  <Highlighter action="highlight" color="#fef3c7" isView={true} padding={3} delay={800}>
                    Co-creator & Design Lead
                  </Highlighter>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Values Section */}
        <div className="py-16">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-12 text-gray-900">
              Our Values
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="text-lg font-bold mb-3 text-gray-900">
                  Startup-First
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Built specifically for startups with affordable pricing for early-stage teams. Designed for small teams who need{' '}
                  <Highlighter action="highlight" color="#fef3c7" isView={true} padding={3} delay={400}>
                    personalized support
                  </Highlighter>{' '}
                  and rapid ticket clearances.
                </p>
              </div>

              <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="text-lg font-bold mb-3 text-gray-900">
                  Builder Focus
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  We believe builders should{' '}
                  <Highlighter action="highlight" color="#fef3c7" isView={true} padding={4} delay={500}>
                    build, not document
                  </Highlighter>
                  . Our platform automates the entire PM workflow so you can focus on creating amazing products.
                </p>
              </div>

              <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="text-lg font-bold mb-3 text-gray-900">
                  Automation-First
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Automatically capture ideas from meetings,{' '}
                  <Highlighter action="highlight" color="#fef3c7" isView={true} padding={4} delay={600}>
                    convert discussions into sprint plans
                  </Highlighter>
                  , and generate insights from meeting transcripts.
                </p>
              </div>

              <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="text-lg font-bold mb-3 text-gray-900">
                  Open Integration
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  We work with your existing tools rather than forcing vendor lock-in. Integrations with{' '}
                  <Highlighter action="highlight" color="#fef3c7" isView={true} padding={4} delay={700}>
                    Jira, Linear, Trello, Slack, Figma
                  </Highlighter>
                  , and more coming soon.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="py-16 text-center border-t border-gray-200">
          <h2 className="text-2xl md:text-3xl font-bold mb-6 text-gray-900">
            Ready to{' '}
            <Highlighter
              action="circle"
              color="#10b981"
              strokeWidth={3}
              padding={8}
              animationDuration={800}
              isView={true}
            >
              transform
            </Highlighter>{' '}
            your meetings?
          </h2>
          <p className="text-base md:text-lg text-gray-600 max-w-2xl mx-auto mb-8">
            Join thousands of teams who are already automating their PM workflows with Zeta
          </p>
          <button
            onClick={() => window.location.hash = '/transcriber'}
            className="px-6 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-lg transition-colors hover:bg-indigo-700"
          >
            Get Started
          </button>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
