import React, { useState } from 'react';
import { Highlighter } from '../components/effects/Highlighter';

const PricingPage: React.FC = () => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  type Price = number | 'Custom';
  
  const plans: {
    name: string;
    monthlyPrice: Price;
    annualPrice: Price;
    description: string;
    features: string[];
    cta: string;
    mostPopular: boolean;
  }[] = [
    {
      name: 'Starter',
      monthlyPrice: 9,
      annualPrice: 7,
      description: 'Perfect for individuals and small teams',
      features: [
        'Up to 10 meeting hours per month',
        'Basic transcription',
        'Manual export options',
        'Email support',
        'Basic integrations'
      ],
      cta: 'Get Started',
      mostPopular: false
    },
    {
      name: 'Professional',
      monthlyPrice: 29,
      annualPrice: 23,
      description: 'For growing teams and startups',
      features: [
        'Up to 100 meeting hours per month',
        'AI-powered insights',
        'Priority support',
        'Advanced integrations',
        'Custom branding',
        'Team collaboration tools'
      ],
      cta: 'Start Free Trial',
      mostPopular: true
    },
    {
      name: 'Enterprise',
      monthlyPrice: 'Custom',
      annualPrice: 'Custom',
      description: 'For large organizations',
      features: [
        'Unlimited meeting hours',
        'Dedicated account manager',
        'Custom integrations',
        'White-label options',
        'API access',
        'SLA guarantee',
        'On-premise deployment'
      ],
      cta: 'Contact Sales',
      mostPopular: false
    }
  ];

  const faqs = [
    {
      question: 'Can I change plans later?',
      answer: 'Yes, you can upgrade, downgrade, or cancel your plan at any time.'
    },
    {
      question: 'Is there a free trial available?',
      answer: 'Yes, all paid plans include a free 14-day trial with full access to features.'
    },
    {
      question: 'How is usage measured?',
      answer: 'Usage is measured in meeting hours. A meeting hour is any meeting up to 60 minutes.'
    },
    {
      question: 'Do you offer discounts for non-profits?',
      answer: 'Yes, we offer special pricing for non-profit organizations and educational institutions.'
    }
  ];

  return (
    <div className="min-h-screen bg-white pt-20">
      {/* Decorative background elements */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/3 left-1/4 w-80 h-80 bg-indigo-100 rounded-full opacity-20 blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-100 rounded-full opacity-20 blur-3xl"></div>
      </div>

      {/* Main content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Simple,{' '}
            <Highlighter
              action="underline"
              color="#6366f1"
              strokeWidth={3}
              isView={true}
            >
              Transparent
            </Highlighter>{' '}
            Pricing
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Choose the plan that works best for you. All plans include core features.
          </p>
          
          {/* Billing toggle */}
          <div className="mt-8 flex items-center justify-center">
            <span className={`mr-3 font-medium ${billingCycle === 'monthly' ? 'text-gray-900' : 'text-gray-500'}`}>
              Monthly
            </span>
            <button
              onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'annual' : 'monthly')}
              className="relative rounded-full w-14 h-7 bg-indigo-100 transition-colors"
            >
              <div className={`absolute top-1 w-5 h-5 rounded-full bg-indigo-600 transition-transform ${
                billingCycle === 'annual' ? 'left-8' : 'left-1'
              }`}></div>
            </button>
            <span className={`ml-3 font-medium ${billingCycle === 'annual' ? 'text-gray-900' : 'text-gray-500'}`}>
              Annual <span className="text-green-600 text-sm ml-1">(Save 20%)</span>
            </span>
          </div>
        </div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-20">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative rounded-2xl border ${
                plan.mostPopular 
                  ? 'border-indigo-500 ring-4 ring-indigo-500/20 z-10' 
                  : 'border-gray-200'
              } p-8 transition-all hover:shadow-xl`}
            >
              {plan.mostPopular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-indigo-600 text-white text-sm font-bold px-4 py-1 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}
              
              <div className="mt-8">
                <h2 className="text-2xl font-bold mb-2">{plan.name}</h2>
                <p className="text-gray-600 mb-6">{plan.description}</p>
                
                <div className="mb-8">
                  {plan.monthlyPrice === 'Custom' || plan.annualPrice === 'Custom' ? (
                    <div>
                      <span className="text-4xl font-bold">Custom</span>
                    </div>
                  ) : (
                    <div>
                      <span className="text-4xl font-bold">
                        ${billingCycle === 'monthly' ? plan.monthlyPrice : plan.annualPrice}
                      </span>
                      <span className="text-gray-600"> / month</span>
                      {billingCycle === 'annual' && typeof plan.annualPrice === 'number' && (
                        <div className="text-sm text-gray-500 mt-1">
                          Billed annually at ${plan.annualPrice * 12}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start">
                      <svg 
                        className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth="2" 
                          d="M5 13l4 4L19 7" 
                        />
                      </svg>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <button
                  className={`w-full py-3 rounded-xl font-semibold transition-colors ${
                    plan.mostPopular
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Feature comparison section */}
        <div className="bg-gradient-to-r from-indigo-50 to-cyan-50 rounded-2xl p-8 md:p-12 mb-20">
          <h2 className="text-3xl font-bold text-center mb-12">
            <Highlighter
              action="underline"
              color="#10b981"
              strokeWidth={3}
              isView={true}
              delay={300}
            >
              Feature Comparison
            </Highlighter>
          </h2>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left py-4 px-4">Feature</th>
                  <th className="text-center py-4 px-4">Starter</th>
                  <th className="text-center py-4 px-4">Professional</th>
                  <th className="text-center py-4 px-4">Enterprise</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="py-4 px-4 font-medium">Meeting Hours</td>
                  <td className="py-4 px-4 text-center">10 / month</td>
                  <td className="py-4 px-4 text-center">100 / month</td>
                  <td className="py-4 px-4 text-center">Unlimited</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 font-medium">Transcription Quality</td>
                  <td className="py-4 px-4 text-center">Standard</td>
                  <td className="py-4 px-4 text-center">Enhanced</td>
                  <td className="py-4 px-4 text-center">Highest</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 font-medium">AI Insights</td>
                  <td className="py-4 px-4 text-center">-</td>
                  <td className="py-4 px-4 text-center">
                    <svg className="w-5 h-5 text-green-500 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <svg className="w-5 h-5 text-green-500 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </td>
                </tr>
                <tr>
                  <td className="py-4 px-4 font-medium">Integrations</td>
                  <td className="py-4 px-4 text-center">Basic</td>
                  <td className="py-4 px-4 text-center">Advanced</td>
                  <td className="py-4 px-4 text-center">Custom</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 font-medium">Support</td>
                  <td className="py-4 px-4 text-center">Email</td>
                  <td className="py-4 px-4 text-center">Priority</td>
                  <td className="py-4 px-4 text-center">Dedicated</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ section */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-center mb-12">
            <Highlighter
              action="underline"
              color="#f59e0b"
              strokeWidth={3}
              isView={true}
              delay={300}
            >
              Frequently Asked Questions
            </Highlighter>
          </h2>
          
          <div className="max-w-3xl mx-auto space-y-6">
            {faqs.map((faq, index) => (
              <div key={index} className="bg-white border border-gray-200 rounded-xl p-6">
                <h3 className="text-lg font-bold mb-2">
                  <Highlighter
                    action="underline"
                    color="#6366f1"
                    strokeWidth={2}
                    isView={true}
                    delay={index * 100}
                  >
                    {faq.question}
                  </Highlighter>
                </h3>
                <p className="text-gray-600">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Final CTA */}
        <div className="text-center py-12">
          <h2 className="text-3xl font-bold mb-6">
            Start your{' '}
            <Highlighter
              action="highlight"
              color="#fef3c7"
              isView={true}
            >
              free trial
            </Highlighter>{' '}
            today
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            Join thousands of teams who are already automating their PM workflows with Zeta
          </p>
          <button className="px-8 py-3 text-base font-semibold text-white bg-indigo-600 rounded-lg transition-colors hover:bg-indigo-700">
            Get Started Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;